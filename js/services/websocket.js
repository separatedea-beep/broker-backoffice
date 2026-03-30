/**
 * WebSocket Manager — real-time streaming for CFD broker bridge.
 *
 * Features:
 *   - Auto-reconnect with exponential backoff
 *   - Heartbeat/ping-pong keep-alive
 *   - Channel subscriptions (positions, prices, accounts, alerts, LP)
 *   - Graceful degradation to REST polling if WS unavailable
 *   - Connection state tracking with event emission
 *
 * Event types the bridge can emit via WS:
 *   position_update  — open position changed (price, P&L, swap)
 *   price_tick        — new price tick for a symbol
 *   account_change    — balance/equity/margin change
 *   margin_warning    — margin level dropped below threshold
 *   lp_status         — LP connection state change
 *   trade_executed    — new trade executed (fill confirmation)
 *   order_placed      — pending order placed/modified/cancelled
 *   connection_status — WS connection state change
 */
class WebSocketManager {
  constructor(bridge) {
    this.bridge = bridge;        // parent BridgeAdapter — receives emitted events
    this.socket = null;
    this.url = '';
    this.token = '';
    this.state = 'disconnected'; // disconnected | connecting | connected | reconnecting
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
    this._pongTimer = null;
    this._channels = new Set();  // subscribed channels
    this._fallbackPolling = null;
  }

  // ── Connection ───────────────────────────────────────────────

  connect(url, token) {
    if (this.socket && this.socket.readyState <= 1) return; // already open/connecting
    this.url = url;
    this.token = token;
    this._doConnect();
  }

  _doConnect() {
    this.state = 'connecting';
    this.bridge._connectionState = this.state;
    this.bridge._emit('connection_status', { state: this.state, wsUrl: this.url });

    try {
      const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
      this.socket = new WebSocket(wsUrl);
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e.message);
      this._onError(e);
      return;
    }

    this.socket.onopen = () => this._onOpen();
    this.socket.onmessage = (e) => this._onMessage(e);
    this.socket.onerror = (e) => this._onError(e);
    this.socket.onclose = (e) => this._onClose(e);
  }

  disconnect() {
    this._clearTimers();
    this._stopFallbackPolling();
    if (this.socket) {
      this.socket.onclose = null; // prevent reconnect on intentional close
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.state = 'disconnected';
    this.bridge._emit('connection_status', { state: 'disconnected' });
  }

  // ── Event Handlers ───────────────────────────────────────────

  _onOpen() {
    console.log('[WS] Connected to', this.url);
    this.state = 'connected';
    this._reconnectAttempts = 0;
    this.bridge._connectionState = 'connected';
    this.bridge._emit('connection_status', { state: 'connected', wsUrl: this.url });
    this._stopFallbackPolling();

    // Re-subscribe to channels
    this._channels.forEach(ch => this._send({ action: 'subscribe', channel: ch }));

    // Start heartbeat
    this._startHeartbeat();
  }

  _onMessage(event) {
    try {
      const msg = JSON.parse(event.data);

      // Handle pong (heartbeat response)
      if (msg.type === 'pong') {
        this._onPong();
        return;
      }

      // Route to bridge event system
      if (msg.type && msg.data) {
        this.bridge._emit(msg.type, msg.data);
      }
    } catch (e) {
      console.warn('[WS] Invalid message:', event.data);
    }
  }

  _onError(error) {
    console.error('[WS] Error:', error);
    this.bridge._lastError = error.message || 'WebSocket error';
  }

  _onClose(event) {
    console.log('[WS] Closed:', event.code, event.reason);
    this._clearTimers();

    if (event.code === 1000) {
      // Normal close — don't reconnect
      this.state = 'disconnected';
      this.bridge._emit('connection_status', { state: 'disconnected' });
      return;
    }

    // Abnormal close — attempt reconnect
    this._scheduleReconnect();
  }

  // ── Reconnection ─────────────────────────────────────────────

  _scheduleReconnect() {
    const maxAttempts = CONFIG.BRIDGE.MAX_RECONNECT || 10;
    if (this._reconnectAttempts >= maxAttempts) {
      console.error('[WS] Max reconnection attempts reached. Falling back to REST polling.');
      this.state = 'disconnected';
      this.bridge._connectionState = 'error';
      this.bridge._emit('connection_status', { state: 'error', error: 'Max reconnect attempts reached' });
      this._startFallbackPolling();
      return;
    }

    this.state = 'reconnecting';
    this.bridge._connectionState = 'reconnecting';
    this._reconnectAttempts++;

    // Exponential backoff: base * 2^attempt, capped at 30s
    const baseDelay = CONFIG.BRIDGE.RECONNECT_DELAY || 3000;
    const backoffMultiplier = CONFIG.BRIDGE.BACKOFF_MULTIPLIER || 1.5;
    const maxDelay = CONFIG.BRIDGE.MAX_RECONNECT_DELAY || 30000;
    const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, this._reconnectAttempts - 1), maxDelay);

    console.log(`[WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this._reconnectAttempts}/${maxAttempts})`);
    this.bridge._emit('connection_status', {
      state: 'reconnecting',
      attempt: this._reconnectAttempts,
      maxAttempts,
      nextRetryMs: delay,
    });

    this._reconnectTimer = setTimeout(() => this._doConnect(), delay);
  }

  // ── Heartbeat ────────────────────────────────────────────────

  _startHeartbeat() {
    const interval = CONFIG.BRIDGE.HEARTBEAT_INTERVAL || 15000;
    const timeout = CONFIG.BRIDGE.PING_TIMEOUT || 5000;

    this._heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this._send({ type: 'ping', ts: Date.now() });

        // If no pong within timeout, consider connection dead
        this._pongTimer = setTimeout(() => {
          console.warn('[WS] Ping timeout — closing connection');
          if (this.socket) this.socket.close(4000, 'Ping timeout');
        }, timeout);
      }
    }, interval);
  }

  _onPong() {
    if (this._pongTimer) { clearTimeout(this._pongTimer); this._pongTimer = null; }
  }

  // ── Channel Subscriptions ────────────────────────────────────

  /**
   * Subscribe to a data channel.
   * Channels: 'positions', 'prices', 'accounts', 'margin', 'lp', 'trades', 'orders'
   */
  subscribeChannel(channel) {
    this._channels.add(channel);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._send({ action: 'subscribe', channel });
    }
  }

  unsubscribeChannel(channel) {
    this._channels.delete(channel);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this._send({ action: 'unsubscribe', channel });
    }
  }

  // ── Fallback REST Polling ────────────────────────────────────

  _startFallbackPolling() {
    if (this._fallbackPolling) return;
    console.log('[WS] Starting fallback REST polling');
    const interval = CONFIG.INTERVALS.POSITIONS || 2000;

    this._fallbackPolling = setInterval(async () => {
      try {
        if (this.bridge.isConnected()) {
          const positions = await this.bridge.getLivePositions();
          this.bridge._emit('position_update', positions);
        }
      } catch (e) {
        // Silently fail — REST polling is best-effort
      }
    }, interval);
  }

  _stopFallbackPolling() {
    if (this._fallbackPolling) {
      clearInterval(this._fallbackPolling);
      this._fallbackPolling = null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  _send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  _clearTimers() {
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
    if (this._pongTimer) { clearTimeout(this._pongTimer); this._pongTimer = null; }
  }

  /** Get current connection info for UI display */
  getStatus() {
    return {
      state: this.state,
      url: this.url,
      reconnectAttempts: this._reconnectAttempts,
      channels: [...this._channels],
      socketState: this.socket ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] : 'NONE',
    };
  }
}

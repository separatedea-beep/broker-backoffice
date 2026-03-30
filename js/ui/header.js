/**
 * Header — page title, clocks, bridge status with connection details, notifications
 */
const Header = {
  render() {
    this.updateClocks();
    this.updateBridgeStatus();
    this.updateNotifBadge();
  },

  updateClocks() {
    const el = U.$('#header-clocks');
    el.innerHTML = CONFIG.CLOCKS.map(c => {
      const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: c.tz });
      return `<span class="clock"><span class="clock-label">${c.label}</span><span class="clock-time">${t}</span></span>`;
    }).join('');
  },

  updateBridgeStatus() {
    const dot = U.$('#bridge-dot');
    const state = S.bridge.state;
    const dotClass = state === 'connected' ? 'dot-green' : state === 'reconnecting' ? 'dot-yellow' : state === 'error' ? 'dot-red' : 'dot-red';
    dot.className = 'status-dot ' + dotClass;

    // Update the bridge button text with latency
    const btn = U.$('#btn-bridge-status');
    if (btn) {
      const latencyStr = S.bridge.latency > 0 ? ` ${S.bridge.latency}ms` : '';
      const typeStr = S.bridge.type === 'mock' ? 'Mock' : S.bridge.type.toUpperCase();
      btn.innerHTML = `<span class="status-dot ${dotClass}"></span><span>${typeStr}${latencyStr}</span>`;
    }
  },

  updateNotifBadge() {
    const badge = U.$('#notif-badge');
    const count = S.dashboard.alerts.filter(a => a.level === 'critical' || a.level === 'warning').length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  },

  setTitle(title, breadcrumb) {
    U.$('#page-title').textContent = title;
    U.$('#breadcrumb').innerHTML = breadcrumb || '';
  },

  /** Show connection details modal */
  showConnectionDetails() {
    const status = API.getBridgeStatus();
    const ws = status.ws;

    Modal.open('Bridge Connection Details', `
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">Bridge Type</span><span>${status.type}</span></div>
        <div class="detail-row"><span class="detail-label">State</span><span class="badge ${status.state === 'connected' ? 'badge-success' : status.state === 'reconnecting' ? 'badge-warning' : 'badge-danger'}">${status.state}</span></div>
        <div class="detail-row"><span class="detail-label">REST Latency</span><span>${status.latency > 0 ? status.latency + 'ms' : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Last Ping</span><span>${status.lastPing ? U.ago(status.lastPing) : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Last Error</span><span class="${status.lastError ? 'text-danger' : ''}">${status.lastError || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Environment</span><span>${CONFIG.BRIDGE.ENVIRONMENT}</span></div>
        <div class="detail-row"><span class="detail-label">REST URL</span><span class="text-sm">${CONFIG.BRIDGE.URL || '(mock)'}</span></div>
        <div class="detail-row"><span class="detail-label">WS URL</span><span class="text-sm">${CONFIG.BRIDGE.WS_URL || '(none)'}</span></div>
      </div>
      ${ws ? `
        <h4 style="margin-top:14px;margin-bottom:8px;font-size:12px;color:var(--text-muted)">WEBSOCKET</h4>
        <div class="detail-grid">
          <div class="detail-row"><span class="detail-label">WS State</span><span class="badge ${ws.state === 'connected' ? 'badge-success' : ws.state === 'reconnecting' ? 'badge-warning' : 'badge-danger'}">${ws.state}</span></div>
          <div class="detail-row"><span class="detail-label">Socket</span><span>${ws.socketState}</span></div>
          <div class="detail-row"><span class="detail-label">Reconnect Attempts</span><span>${ws.reconnectAttempts}</span></div>
          <div class="detail-row"><span class="detail-label">Channels</span><span>${ws.channels.join(', ') || 'None'}</span></div>
        </div>
      ` : ''}
      <h4 style="margin-top:14px;margin-bottom:8px;font-size:12px;color:var(--text-muted)">CONFIGURATION</h4>
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">Connect Timeout</span><span>${CONFIG.BRIDGE.CONNECT_TIMEOUT}ms</span></div>
        <div class="detail-row"><span class="detail-label">Request Timeout</span><span>${CONFIG.BRIDGE.REQUEST_TIMEOUT}ms</span></div>
        <div class="detail-row"><span class="detail-label">Max Reconnect</span><span>${CONFIG.BRIDGE.MAX_RECONNECT}</span></div>
        <div class="detail-row"><span class="detail-label">Heartbeat</span><span>${CONFIG.BRIDGE.HEARTBEAT_INTERVAL}ms</span></div>
        <div class="detail-row"><span class="detail-label">Failover URL</span><span>${CONFIG.BRIDGE.FAILOVER_URL || 'None'}</span></div>
      </div>
    `);
  },
};

// Update clocks every 30s
setInterval(() => Header.updateClocks(), 30000);

/**
 * Bridge Adapter — complete interface for connecting to any CFD broker platform.
 *
 * ~50 methods covering every operation a real broker back office needs.
 * Implementations plug into this interface; the UI calls these methods
 * through the API service layer and never touches the bridge directly.
 *
 * Included adapters:
 *   MockBridge       — built-in simulated data (default)
 *   MetaApiBridge    — MetaApi cloud bridge (REST + WS)
 *   FixBridge        — FIX 4.4/5.0 protocol
 *   DirectMT5Bridge  — MT5 Manager API
 *   CustomBridge     — your own REST/WS bridge
 *
 * To connect a real bridge:
 *   1. Set CONFIG.BRIDGE.TYPE and connection details in config.js
 *   2. Implement the adapter methods in the relevant class below
 *   3. The API service routes all calls through the adapter automatically
 */

// ═══════════════════════════════════════════════════════════════
//  BASE ADAPTER — all methods a CFD broker bridge must implement
// ═══════════════════════════════════════════════════════════════

class BridgeAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.ws = null;           // WebSocket manager (set after connect)
    this._listeners = {};
    this._connectionState = 'disconnected'; // disconnected | connecting | connected | reconnecting | error
    this._lastError = null;
    this._latency = 0;
    this._lastPing = null;
  }

  // ── Connection Lifecycle ─────────────────────────────────────
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { this.connected = false; this._connectionState = 'disconnected'; }
  isConnected() { return this.connected; }
  getConnectionState() { return this._connectionState; }
  getLatency() { return this._latency; }
  getLastError() { return this._lastError; }

  /** Ping the bridge and measure round-trip latency */
  async ping() {
    const start = performance.now();
    try {
      await this.getServerTime();
      this._latency = Math.round(performance.now() - start);
      this._lastPing = new Date();
      return this._latency;
    } catch (e) {
      this._lastError = e.message;
      return -1;
    }
  }

  // ── Account Lifecycle ────────────────────────────────────────
  /** List accounts with optional filters { status, group, search, page, pageSize } */
  async getAccounts(filters) { throw new Error('Not implemented'); }
  /** Get full account info by login or account ID */
  async getAccountInfo(login) { throw new Error('Not implemented'); }
  /** Create a new trading account on the platform */
  async createAccount(params) { throw new Error('Not implemented'); }
  // params: { name, email, group, leverage, platform, currency, password }
  /** Delete/archive an account */
  async deleteAccount(login) { throw new Error('Not implemented'); }
  /** Enable a disabled/suspended account */
  async enableAccount(login) { throw new Error('Not implemented'); }
  /** Disable/suspend an account (blocks trading) */
  async disableAccount(login) { throw new Error('Not implemented'); }
  /** Set account leverage */
  async setLeverage(login, leverage) { throw new Error('Not implemented'); }
  /** Move account to a different group */
  async setGroup(login, group) { throw new Error('Not implemented'); }
  /** Adjust trading credit */
  async setCredit(login, amount, comment) { throw new Error('Not implemented'); }
  /** Get real-time account balance/equity snapshot */
  async getAccountBalance(login) { throw new Error('Not implemented'); }
  /** Change account password (trading or investor) */
  async setAccountPassword(login, newPassword, type) { throw new Error('Not implemented'); }
  // type: 'trading' | 'investor'

  // ── Positions (Open Trades) ──────────────────────────────────
  /** Get all live/open positions. Optional login filter. */
  async getLivePositions(login) { throw new Error('Not implemented'); }
  /** Get aggregated exposure by symbol { symbol: { long, short, net } } */
  async getExposure() { throw new Error('Not implemented'); }
  /** Close a single position by ticket */
  async closePosition(ticket) { throw new Error('Not implemented'); }
  /** Close all positions for an account */
  async closeAllPositions(login) { throw new Error('Not implemented'); }
  /** Partially close a position (reduce volume) */
  async partialClose(ticket, volume) { throw new Error('Not implemented'); }
  /** Modify SL/TP on an open position */
  async modifyPosition(ticket, sl, tp) { throw new Error('Not implemented'); }

  // ── Pending Orders ───────────────────────────────────────────
  /** Get all pending/conditional orders. Optional login filter. */
  async getPendingOrders(login) { throw new Error('Not implemented'); }
  /** Place a new pending order */
  async placePendingOrder(params) { throw new Error('Not implemented'); }
  // params: { login, symbol, direction, volume, type, price, sl, tp, expiry, comment }
  // type: 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop' | 'buy_stop_limit' | 'sell_stop_limit'
  /** Cancel a pending order */
  async cancelPendingOrder(ticket) { throw new Error('Not implemented'); }
  /** Modify a pending order (price, SL, TP, expiry) */
  async modifyPendingOrder(ticket, params) { throw new Error('Not implemented'); }

  // ── Trade Execution ──────────────────────────────────────────
  /** Execute a market order */
  async placeTrade(params) { throw new Error('Not implemented'); }
  // params: { login, symbol, direction, volume, sl, tp, comment, magicNumber }

  // ── Trade & Deal History ─────────────────────────────────────
  /** Get closed trade (position) history */
  async getTradeHistory(login, from, to) { throw new Error('Not implemented'); }
  /** Get deal (transaction) history — individual fills */
  async getDealHistory(login, from, to) { throw new Error('Not implemented'); }
  /** Get rejected/failed order log */
  async getRejectedOrders(login, from, to) { throw new Error('Not implemented'); }

  // ── Margin & Risk ────────────────────────────────────────────
  /** Check current margin level for an account */
  async checkMarginLevel(login) { throw new Error('Not implemented'); }
  /** Trigger stop-out / forced liquidation on an account */
  async triggerStopOut(login, reason) { throw new Error('Not implemented'); }
  /** Set margin call warning level for an account or group */
  async setMarginCallLevel(target, level) { throw new Error('Not implemented'); }
  // target: login or group name; level: margin % threshold

  // ── Symbol Management ────────────────────────────────────────
  /** Get all available symbols with specs */
  async getSymbols() { throw new Error('Not implemented'); }
  /** Get detailed spec for a single symbol */
  async getSymbolSpec(symbol) { throw new Error('Not implemented'); }
  /** Push full symbol specification to the platform */
  async pushSymbolSpec(symbol, spec) { throw new Error('Not implemented'); }
  // spec: { contractSize, digits, spreadType, minLot, maxLot, lotStep, marginRate, sessions, ... }
  /** Add a new symbol to the platform */
  async addSymbol(spec) { throw new Error('Not implemented'); }
  /** Remove/disable a symbol */
  async removeSymbol(symbol) { throw new Error('Not implemented'); }
  /** Enable a previously disabled symbol */
  async enableSymbol(symbol) { throw new Error('Not implemented'); }
  /** Disable a symbol (stop new orders) */
  async disableSymbol(symbol) { throw new Error('Not implemented'); }
  /** Update swap rates for a symbol */
  async updateSwapRates(symbol, longSwap, shortSwap) { throw new Error('Not implemented'); }
  /** Get full swap schedule (triple days, holiday swaps) */
  async getSwapSchedule() { throw new Error('Not implemented'); }
  /** Push swap configuration for a symbol */
  async pushSwapConfig(symbol, config) { throw new Error('Not implemented'); }
  // config: { longSwap, shortSwap, tripleDay, swapType }

  // ── Group Management ─────────────────────────────────────────
  /** Get all trading groups with their configs */
  async getGroups() { throw new Error('Not implemented'); }
  /** Create a new trading group */
  async createGroup(config) { throw new Error('Not implemented'); }
  // config: { name, leverage, marginCallLevel, stopOutLevel, symbolOverrides, ... }
  /** Update a group's configuration */
  async updateGroupConfig(groupName, changes) { throw new Error('Not implemented'); }
  /** Delete a trading group (must be empty) */
  async deleteGroup(groupName) { throw new Error('Not implemented'); }

  // ── Transaction Processing ───────────────────────────────────
  /** Process a deposit (credit funds to account) */
  async processDeposit(params) { throw new Error('Not implemented'); }
  // params: { login, amount, currency, method, gatewayRef, comment }
  /** Process a withdrawal (debit funds from account) */
  async processWithdrawal(params) { throw new Error('Not implemented'); }
  // params: { login, amount, currency, method, destination, comment }
  /** Get transaction status by reference ID */
  async getTransactionStatus(refId) { throw new Error('Not implemented'); }
  /** Get transaction history for an account */
  async getTransactions(filters) { throw new Error('Not implemented'); }

  // ── LP Operations ────────────────────────────────────────────
  /** Get all LP configurations and status */
  async getLPs() { throw new Error('Not implemented'); }
  /** Get detailed LP status (margin, latency, sessions) */
  async getLPStatus(lpId) { throw new Error('Not implemented'); }
  /** Connect/reconnect to an LP */
  async connectLP(lpId) { throw new Error('Not implemented'); }
  /** Disconnect from an LP */
  async disconnectLP(lpId) { throw new Error('Not implemented'); }
  /** Top up margin with an LP */
  async topUpMargin(lpId, amount, currency) { throw new Error('Not implemented'); }
  /** Get LP session/FIX log */
  async getLPSessionLog(lpId, from, to) { throw new Error('Not implemented'); }

  // ── Finance / Treasury ───────────────────────────────────────
  /** Get EMI account balances */
  async getEMIAccounts() { throw new Error('Not implemented'); }
  /** Execute inter-EMI transfer */
  async executeTransfer(from, to, amount, currency) { throw new Error('Not implemented'); }
  /** Fund an LP margin call */
  async fundMarginCall(lpId, amount, currency) { throw new Error('Not implemented'); }
  /** Execute IB commission payout */
  async executeIBPayout(ibId, amount, currency, method) { throw new Error('Not implemented'); }
  /** Get payment gateway settlement data */
  async getGatewaySettlements(gateway, period) { throw new Error('Not implemented'); }

  // ── Reconciliation ───────────────────────────────────────────
  /** Trigger a reconciliation run */
  async runReconciliation(date) { throw new Error('Not implemented'); }
  /** Get reconciliation results for a date */
  async getReconciliationResults(date) { throw new Error('Not implemented'); }

  // ── Reporting ────────────────────────────────────────────────
  /** Get daily P&L data */
  async getDailyPnl(from, to, book) { throw new Error('Not implemented'); }
  /** Get LP margin utilisation report */
  async getLPMarginReport() { throw new Error('Not implemented'); }
  /** Get IB commission data for a period */
  async getIBCommissions(period) { throw new Error('Not implemented'); }
  /** Get monthly management accounts */
  async getMonthlyAccounts(month) { throw new Error('Not implemented'); }

  // ── Server Operations ────────────────────────────────────────
  /** Get server time (used for ping/latency measurement) */
  async getServerTime() { throw new Error('Not implemented'); }
  /** Get basic server health metrics */
  async getServerHealth() { throw new Error('Not implemented'); }
  /** Get detailed server metrics (CPU, memory, disk, connections) */
  async getDetailedMetrics(serverName) { throw new Error('Not implemented'); }
  /** Get count of currently connected users */
  async getOnlineUsers() { throw new Error('Not implemented'); }
  /** Restart a trading server (requires confirmation) */
  async restartServer(serverName) { throw new Error('Not implemented'); }
  /** Toggle maintenance mode on a server */
  async setMaintenanceMode(serverName, enabled) { throw new Error('Not implemented'); }

  // ── Real-Time Subscriptions ──────────────────────────────────
  /**
   * Subscribe to a real-time event stream.
   * Events: position_update, price_tick, account_change, margin_warning,
   *         lp_status, trade_executed, order_placed, connection_status
   * @returns {Function} unsubscribe function
   */
  subscribe(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    };
  }

  /** Emit an event to all subscribers */
  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[Bridge] Event handler error (${event}):`, e); }
    });
  }

  /** Subscribe to live position updates (convenience wrapper) */
  subscribePositions(callback) { return this.subscribe('position_update', callback); }
  /** Subscribe to price ticks */
  subscribePrices(callback) { return this.subscribe('price_tick', callback); }
  /** Subscribe to account balance/margin changes */
  subscribeAccountChanges(callback) { return this.subscribe('account_change', callback); }
  /** Subscribe to margin warnings */
  subscribeMarginWarnings(callback) { return this.subscribe('margin_warning', callback); }
  /** Subscribe to LP status changes */
  subscribeLPStatus(callback) { return this.subscribe('lp_status', callback); }
  /** Subscribe to trade execution events */
  subscribeTradeExecutions(callback) { return this.subscribe('trade_executed', callback); }
  /** Subscribe to connection state changes */
  subscribeConnectionStatus(callback) { return this.subscribe('connection_status', callback); }
}


// ═══════════════════════════════════════════════════════════════
//  METAAPI BRIDGE — MetaApi cloud bridge (REST + WebSocket)
// ═══════════════════════════════════════════════════════════════

class MetaApiBridge extends BridgeAdapter {
  constructor(config) {
    super(config);
    this._baseUrl = config.URL;
    this._token = config.API_KEY;
    this._headers = { 'Content-Type': 'application/json', 'auth-token': config.API_KEY };
  }

  async _request(method, path, body) {
    const url = `${this._baseUrl}${path}`;
    const opts = { method, headers: this._headers };
    if (body) opts.body = JSON.stringify(body);
    const start = performance.now();
    try {
      const res = await fetch(url, opts);
      this._latency = Math.round(performance.now() - start);
      if (!res.ok) { const err = await res.text(); throw new Error(`${res.status}: ${err}`); }
      return res.json();
    } catch (e) {
      this._lastError = e.message;
      this._emit('connection_status', { state: 'error', error: e.message });
      throw e;
    }
  }

  async connect() {
    this._connectionState = 'connecting';
    this._emit('connection_status', { state: 'connecting' });
    try {
      // Validate credentials by fetching server time
      await this._request('GET', '/server/time');
      this.connected = true;
      this._connectionState = 'connected';
      this._emit('connection_status', { state: 'connected' });
      console.log('[MetaApiBridge] Connected to', this._baseUrl);

      // Start WebSocket if URL provided
      if (this.config.WS_URL) {
        this._connectWebSocket();
      }
    } catch (e) {
      this._connectionState = 'error';
      this._lastError = e.message;
      this._emit('connection_status', { state: 'error', error: e.message });
      throw e;
    }
  }

  _connectWebSocket() {
    if (!this.config.WS_URL) return;
    if (this.ws) this.ws.connect(this.config.WS_URL, this.config.API_KEY);
  }

  async disconnect() {
    if (this.ws) this.ws.disconnect();
    this.connected = false;
    this._connectionState = 'disconnected';
    this._emit('connection_status', { state: 'disconnected' });
  }

  // ── Implement all methods via REST ───────────────────────────
  async getAccounts(filters) { return this._request('GET', '/accounts?' + new URLSearchParams(filters || {})); }
  async getAccountInfo(login) { return this._request('GET', `/accounts/${login}`); }
  async createAccount(params) { return this._request('POST', '/accounts', params); }
  async deleteAccount(login) { return this._request('DELETE', `/accounts/${login}`); }
  async enableAccount(login) { return this._request('POST', `/accounts/${login}/enable`); }
  async disableAccount(login) { return this._request('POST', `/accounts/${login}/disable`); }
  async setLeverage(login, leverage) { return this._request('PUT', `/accounts/${login}/leverage`, { leverage }); }
  async setGroup(login, group) { return this._request('PUT', `/accounts/${login}/group`, { group }); }
  async setCredit(login, amount, comment) { return this._request('POST', `/accounts/${login}/credit`, { amount, comment }); }
  async getAccountBalance(login) { return this._request('GET', `/accounts/${login}/balance`); }
  async setAccountPassword(login, pw, type) { return this._request('PUT', `/accounts/${login}/password`, { password: pw, type }); }

  async getLivePositions(login) { return this._request('GET', `/positions${login ? '?login=' + login : ''}`); }
  async getExposure() { return this._request('GET', '/positions/exposure'); }
  async closePosition(ticket) { return this._request('POST', `/positions/${ticket}/close`); }
  async closeAllPositions(login) { return this._request('POST', `/accounts/${login}/close-all`); }
  async partialClose(ticket, volume) { return this._request('POST', `/positions/${ticket}/partial-close`, { volume }); }
  async modifyPosition(ticket, sl, tp) { return this._request('PUT', `/positions/${ticket}`, { sl, tp }); }

  async getPendingOrders(login) { return this._request('GET', `/orders/pending${login ? '?login=' + login : ''}`); }
  async placePendingOrder(params) { return this._request('POST', '/orders/pending', params); }
  async cancelPendingOrder(ticket) { return this._request('DELETE', `/orders/pending/${ticket}`); }
  async modifyPendingOrder(ticket, params) { return this._request('PUT', `/orders/pending/${ticket}`, params); }

  async placeTrade(params) { return this._request('POST', '/trades', params); }
  async getTradeHistory(login, from, to) { return this._request('GET', `/trades/history?login=${login}&from=${from}&to=${to}`); }
  async getDealHistory(login, from, to) { return this._request('GET', `/deals/history?login=${login}&from=${from}&to=${to}`); }
  async getRejectedOrders(login, from, to) { return this._request('GET', `/orders/rejected?login=${login}&from=${from}&to=${to}`); }

  async checkMarginLevel(login) { return this._request('GET', `/accounts/${login}/margin`); }
  async triggerStopOut(login, reason) { return this._request('POST', `/accounts/${login}/stop-out`, { reason }); }
  async setMarginCallLevel(target, level) { return this._request('PUT', `/margin/call-level`, { target, level }); }

  async getSymbols() { return this._request('GET', '/symbols'); }
  async getSymbolSpec(symbol) { return this._request('GET', `/symbols/${symbol}`); }
  async pushSymbolSpec(symbol, spec) { return this._request('PUT', `/symbols/${symbol}`, spec); }
  async addSymbol(spec) { return this._request('POST', '/symbols', spec); }
  async removeSymbol(symbol) { return this._request('DELETE', `/symbols/${symbol}`); }
  async enableSymbol(symbol) { return this._request('POST', `/symbols/${symbol}/enable`); }
  async disableSymbol(symbol) { return this._request('POST', `/symbols/${symbol}/disable`); }
  async updateSwapRates(sym, l, s) { return this._request('PUT', `/symbols/${sym}/swaps`, { longSwap: l, shortSwap: s }); }
  async getSwapSchedule() { return this._request('GET', '/symbols/swap-schedule'); }
  async pushSwapConfig(symbol, cfg) { return this._request('PUT', `/symbols/${symbol}/swap-config`, cfg); }

  async getGroups() { return this._request('GET', '/groups'); }
  async createGroup(config) { return this._request('POST', '/groups', config); }
  async updateGroupConfig(name, changes) { return this._request('PUT', `/groups/${name}`, changes); }
  async deleteGroup(name) { return this._request('DELETE', `/groups/${name}`); }

  async processDeposit(params) { return this._request('POST', '/transactions/deposit', params); }
  async processWithdrawal(params) { return this._request('POST', '/transactions/withdrawal', params); }
  async getTransactionStatus(refId) { return this._request('GET', `/transactions/${refId}`); }
  async getTransactions(filters) { return this._request('GET', '/transactions?' + new URLSearchParams(filters || {})); }

  async getLPs() { return this._request('GET', '/lp'); }
  async getLPStatus(lpId) { return this._request('GET', `/lp/${lpId}`); }
  async connectLP(lpId) { return this._request('POST', `/lp/${lpId}/connect`); }
  async disconnectLP(lpId) { return this._request('POST', `/lp/${lpId}/disconnect`); }
  async topUpMargin(lpId, amount, ccy) { return this._request('POST', `/lp/${lpId}/topup`, { amount, currency: ccy }); }
  async getLPSessionLog(lpId, from, to) { return this._request('GET', `/lp/${lpId}/log?from=${from}&to=${to}`); }

  async getEMIAccounts() { return this._request('GET', '/finance/emi'); }
  async executeTransfer(from, to, amount, ccy) { return this._request('POST', '/finance/emi/transfer', { from, to, amount, currency: ccy }); }
  async fundMarginCall(lpId, amount, ccy) { return this._request('POST', `/finance/margin-call/${lpId}/fund`, { amount, currency: ccy }); }
  async executeIBPayout(ibId, amount, ccy, method) { return this._request('POST', `/finance/ib-payout`, { ibId, amount, currency: ccy, method }); }
  async getGatewaySettlements(gw, period) { return this._request('GET', `/finance/settlements?gateway=${gw}&period=${period}`); }

  async runReconciliation(date) { return this._request('POST', '/reconciliation/run', { date }); }
  async getReconciliationResults(date) { return this._request('GET', `/reconciliation/${date}`); }

  async getDailyPnl(from, to, book) { return this._request('GET', `/reporting/pnl?from=${from}&to=${to}${book ? '&book=' + book : ''}`); }
  async getLPMarginReport() { return this._request('GET', '/reporting/lp-margin'); }
  async getIBCommissions(period) { return this._request('GET', `/reporting/ib-commissions?period=${period}`); }
  async getMonthlyAccounts(month) { return this._request('GET', `/reporting/monthly?month=${month}`); }

  async getServerTime() { return this._request('GET', '/server/time'); }
  async getServerHealth() { return this._request('GET', '/server/health'); }
  async getDetailedMetrics(name) { return this._request('GET', `/server/${name}/metrics`); }
  async getOnlineUsers() { return this._request('GET', '/server/online-users'); }
  async restartServer(name) { return this._request('POST', `/server/${name}/restart`); }
  async setMaintenanceMode(name, on) { return this._request('PUT', `/server/${name}/maintenance`, { enabled: on }); }
}


// ═══════════════════════════════════════════════════════════════
//  FIX BRIDGE — FIX 4.4/5.0 protocol (stub with REST wrapper)
// ═══════════════════════════════════════════════════════════════

class FixBridge extends MetaApiBridge {
  // Inherits all REST methods from MetaApiBridge.
  // Override connect() to establish FIX session via your gateway.
  async connect() {
    console.log('[FixBridge] Connecting via FIX gateway at', this._baseUrl);
    return super.connect();
  }
}


// ═══════════════════════════════════════════════════════════════
//  DIRECT MT5 BRIDGE — MT5 Manager API
// ═══════════════════════════════════════════════════════════════

class DirectMT5Bridge extends MetaApiBridge {
  // Inherits all REST methods. Override as needed for MT5 Manager API specifics.
  async connect() {
    console.log('[DirectMT5Bridge] Connecting via MT5 Manager API at', this._baseUrl);
    return super.connect();
  }
}


// ═══════════════════════════════════════════════════════════════
//  CUSTOM BRIDGE — extend for any proprietary protocol
// ═══════════════════════════════════════════════════════════════

class CustomBridge extends MetaApiBridge {
  async connect() {
    console.log('[CustomBridge] Connecting via custom bridge at', this._baseUrl);
    return super.connect();
  }
}


// ═══════════════════════════════════════════════════════════════
//  FACTORY
// ═══════════════════════════════════════════════════════════════

const BridgeFactory = {
  create(config) {
    switch (config.TYPE) {
      case 'metaapi': return new MetaApiBridge(config);
      case 'fix': return new FixBridge(config);
      case 'direct_mt5': return new DirectMT5Bridge(config);
      case 'custom': return new CustomBridge(config);
      case 'mock':
      default: return null; // Mock mode — API service handles data locally
    }
  }
};

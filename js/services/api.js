/**
 * API Service — routes all UI calls through the bridge adapter.
 *
 * When CONFIG.BRIDGE.TYPE === 'mock': reads from global state S (populated by Mock).
 * When a real bridge is connected: every method calls the bridge adapter.
 *
 * The UI never calls bridge methods directly — always through this layer.
 */
const API = {
  bridge: null,
  ws: null,

  // ── Initialization ───────────────────────────────────────────

  async init() {
    if (CONFIG.BRIDGE.TYPE === 'mock') {
      Mock.init();
      S.bridge.connected = true;
      S.bridge.type = 'mock';
      S.bridge.state = 'connected';
      return;
    }

    this.bridge = BridgeFactory.create(CONFIG.BRIDGE);
    if (!this.bridge) return;

    // Attach WebSocket manager
    this.ws = new WebSocketManager(this.bridge);
    this.bridge.ws = this.ws;

    try {
      await this.bridge.connect();
      S.bridge.connected = this.bridge.isConnected();
      S.bridge.type = CONFIG.BRIDGE.TYPE;
      S.bridge.state = this.bridge.getConnectionState();
      S.bridge.latency = this.bridge.getLatency();

      // Subscribe to real-time channels
      if (this.ws && CONFIG.BRIDGE.WS_URL) {
        this.ws.subscribeChannel('positions');
        this.ws.subscribeChannel('prices');
        this.ws.subscribeChannel('accounts');
        this.ws.subscribeChannel('margin');
        this.ws.subscribeChannel('lp');
        this.ws.subscribeChannel('trades');
      }

      // Wire up event handlers to update state
      this.bridge.subscribePositions(data => { S.dealingDesk.livePositions = data; });
      this.bridge.subscribeAccountChanges(data => { this._mergeAccountUpdate(data); });
      this.bridge.subscribeMarginWarnings(data => { S.dashboard.alerts.unshift(data); });
      this.bridge.subscribeLPStatus(data => { this._mergeLPUpdate(data); });
      this.bridge.subscribeConnectionStatus(data => {
        S.bridge.state = data.state;
        S.bridge.connected = data.state === 'connected';
      });

      // Start latency ping interval
      this._startPingLoop();

    } catch (e) {
      console.error('[API] Bridge connection failed:', e);
      S.bridge.connected = false;
      S.bridge.state = 'error';
      S.bridge.lastError = e.message;
    }
  },

  _startPingLoop() {
    setInterval(async () => {
      if (this.bridge && this.bridge.isConnected()) {
        S.bridge.latency = await this.bridge.ping();
        S.bridge.lastPing = new Date();
      }
    }, CONFIG.BRIDGE.PING_INTERVAL || 30000);
  },

  _mergeAccountUpdate(data) {
    if (!data || !data.login) return;
    const acc = S.accounts.list.find(a => a.login === data.login);
    if (acc) Object.assign(acc, data);
  },

  _mergeLPUpdate(data) {
    if (!data || !data.id) return;
    const lp = S.lp.providers.find(l => l.id === data.id);
    if (lp) Object.assign(lp, data);
  },

  /** Check if running in bridge mode (not mock) */
  _hasBridge() { return this.bridge && this.bridge.isConnected(); },

  // ── Account Operations ───────────────────────────────────────

  async getAccounts(filters) {
    if (this._hasBridge()) return this.bridge.getAccounts(filters);
    let list = [...S.accounts.list];
    if (filters?.status && filters.status !== 'all') list = list.filter(a => a.status === filters.status);
    if (filters?.book && filters.book !== 'all') list = list.filter(a => a.book === filters.book);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || String(a.login).includes(q));
    }
    return list;
  },

  async getAccountDetail(id) {
    if (this._hasBridge()) return this.bridge.getAccountInfo(id);
    return S.accounts.list.find(a => a.id === id) || null;
  },

  async createAccount(params) {
    if (this._hasBridge()) return this.bridge.createAccount(params);
    // Mock: add to local state
    const acc = {
      id: 'ACC' + (10001 + S.accounts.list.length),
      login: 50001 + S.accounts.list.length,
      ...params,
      status: 'active',
      balance: 0, equity: 0, credit: 0, bonus: 0,
      margin: 0, freeMargin: 0, marginLevel: 0,
      openPositions: 0, riskScore: 0, toxicity: 0,
      ibId: null, kycStatus: 'pending',
      createdAt: new Date(), lastLogin: null, lastTrade: null,
      totalTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0,
      tradeFrequency: 0, profitFactor: 0, edgePerTrade: 0,
      edgePerDay: 0, kellyFraction: 0, sharpeRatio: 0, maxDrawdown: 0,
      por: 1, porRecommendation: 'b_book', porReason: 'New account — no data',
    };
    S.accounts.list.unshift(acc);
    return acc;
  },

  async updateAccount(id, changes) {
    if (this._hasBridge()) {
      const login = S.accounts.list.find(a => a.id === id)?.login || id;
      if (changes.leverage) await this.bridge.setLeverage(login, changes.leverage);
      if (changes.group) await this.bridge.setGroup(login, changes.group);
      if (changes.status === 'suspended') await this.bridge.disableAccount(login);
      if (changes.status === 'active') await this.bridge.enableAccount(login);
      if (changes.credit !== undefined) await this.bridge.setCredit(login, changes.credit, changes.comment || '');
      return;
    }
    const acc = S.accounts.list.find(a => a.id === id);
    if (acc) Object.assign(acc, changes);
  },

  async deleteAccount(id) {
    if (this._hasBridge()) return this.bridge.deleteAccount(id);
    S.accounts.list = S.accounts.list.filter(a => a.id !== id);
  },

  // ── Deposits & Withdrawals ───────────────────────────────────

  async getTransactions(filters) {
    if (this._hasBridge()) return this.bridge.getTransactions(filters);
    let list = [...S.deposits.history];
    if (filters?.type && filters.type !== 'all') list = list.filter(t => t.type === filters.type);
    if (filters?.status && filters.status !== 'all') list = list.filter(t => t.status === filters.status);
    return list;
  },

  async approveTransaction(id) {
    if (this._hasBridge()) {
      const txn = S.deposits.history.find(t => t.id === id);
      if (!txn) return;
      if (txn.type === 'deposit') {
        await this.bridge.processDeposit({ login: txn.accountId, amount: txn.amount, currency: txn.currency, method: txn.method, gatewayRef: txn.gatewayRef });
      } else {
        await this.bridge.processWithdrawal({ login: txn.accountId, amount: txn.amount, currency: txn.currency, method: txn.method, destination: txn.gatewayRef });
      }
    }
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) { txn.status = 'approved'; txn.processedAt = new Date(); txn.reviewedBy = 'Admin'; }
    S.deposits.pending = S.deposits.history.filter(t => ['pending', 'under_investigation'].includes(t.status));
  },

  async rejectTransaction(id, reason) {
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) { txn.status = 'rejected'; txn.processedAt = new Date(); txn.reviewedBy = 'Admin'; txn.notes = reason; }
    S.deposits.pending = S.deposits.history.filter(t => ['pending', 'under_investigation'].includes(t.status));
  },

  async investigateTransaction(id) {
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) txn.status = 'under_investigation';
  },

  // ── Trades ───────────────────────────────────────────────────

  async getTradeHistory(filters) {
    if (this._hasBridge() && filters?.account) return this.bridge.getTradeHistory(filters.account, filters.dateFrom, filters.dateTo);
    let list = [...S.trades.history];
    if (filters?.account) list = list.filter(t => t.accountId === filters.account || String(t.accountLogin).includes(filters.account));
    if (filters?.symbol) list = list.filter(t => t.symbol === filters.symbol);
    return list;
  },

  async getPendingOrders(login) {
    if (this._hasBridge()) return this.bridge.getPendingOrders(login);
    return S.trades.pending || [];
  },

  async placePendingOrder(params) {
    if (this._hasBridge()) return this.bridge.placePendingOrder(params);
    const order = { ticket: Date.now(), ...params, status: 'pending', createdAt: new Date() };
    if (!S.trades.pending) S.trades.pending = [];
    S.trades.pending.push(order);
    return order;
  },

  async cancelPendingOrder(ticket) {
    if (this._hasBridge()) return this.bridge.cancelPendingOrder(ticket);
    S.trades.pending = (S.trades.pending || []).filter(o => o.ticket !== ticket);
  },

  // ── Dealing Desk ─────────────────────────────────────────────

  async getLivePositions(filters) {
    if (this._hasBridge()) return this.bridge.getLivePositions(filters?.login);
    let list = [...S.dealingDesk.livePositions];
    if (filters?.symbol && filters.symbol !== 'all') list = list.filter(p => p.symbol === filters.symbol);
    if (filters?.book && filters.book !== 'all') list = list.filter(p => p.book === filters.book);
    if (filters?.minSize) list = list.filter(p => p.volume >= filters.minSize);
    return list;
  },

  async closePosition(ticket) {
    if (this._hasBridge()) return this.bridge.closePosition(ticket);
    S.dealingDesk.livePositions = S.dealingDesk.livePositions.filter(p => p.ticket !== ticket);
  },

  async closeAllPositions(login) {
    if (this._hasBridge()) return this.bridge.closeAllPositions(login);
    S.dealingDesk.livePositions = S.dealingDesk.livePositions.filter(p => p.login !== login);
  },

  async partialClose(ticket, volume) {
    if (this._hasBridge()) return this.bridge.partialClose(ticket, volume);
    const pos = S.dealingDesk.livePositions.find(p => p.ticket === ticket);
    if (pos) pos.volume = Math.max(0, pos.volume - volume);
  },

  async modifyPosition(ticket, sl, tp) {
    if (this._hasBridge()) return this.bridge.modifyPosition(ticket, sl, tp);
    const pos = S.dealingDesk.livePositions.find(p => p.ticket === ticket);
    if (pos) { pos.sl = sl; pos.tp = tp; }
  },

  async rerouteAccount(accountId, newBook, reason) {
    const routing = S.dealingDesk.routing.find(r => r.accountId === accountId);
    if (routing) { routing.currentBook = newBook; routing.lastChanged = new Date(); routing.changedBy = 'Dealer'; routing.reason = reason; }
    const acc = S.accounts.list.find(a => a.id === accountId);
    if (acc) acc.book = newBook;
    if (this._hasBridge() && acc) await this.bridge.setGroup(acc.login, newBook === 'a_book' ? 'A-Book' : 'B-Book');
  },

  async triggerStopOut(login, reason) {
    if (this._hasBridge()) return this.bridge.triggerStopOut(login, reason);
    // Mock: remove from queue
    S.dealingDesk.stopoutQueue = S.dealingDesk.stopoutQueue.filter(q => q.login !== login);
  },

  // ── Margin ───────────────────────────────────────────────────

  async checkMarginLevel(login) {
    if (this._hasBridge()) return this.bridge.checkMarginLevel(login);
    const acc = S.accounts.list.find(a => a.login === login);
    return acc ? { login, marginLevel: acc.marginLevel, equity: acc.equity, margin: acc.margin } : null;
  },

  // ── LP Management ────────────────────────────────────────────

  async getLPs() {
    if (this._hasBridge()) return this.bridge.getLPs();
    return S.lp.providers;
  },

  async getLPStatus(lpId) {
    if (this._hasBridge()) return this.bridge.getLPStatus(lpId);
    return S.lp.providers.find(l => l.id === lpId);
  },

  async connectLP(lpId) {
    if (this._hasBridge()) return this.bridge.connectLP(lpId);
    const lp = S.lp.providers.find(l => l.id === lpId);
    if (lp) lp.status = 'connected';
  },

  async disconnectLP(lpId) {
    if (this._hasBridge()) return this.bridge.disconnectLP(lpId);
    const lp = S.lp.providers.find(l => l.id === lpId);
    if (lp) lp.status = 'disconnected';
  },

  async topUpMargin(lpId, amount, currency) {
    if (this._hasBridge()) return this.bridge.topUpMargin(lpId, amount, currency);
    const lp = S.lp.providers.find(l => l.id === lpId);
    if (lp) { lp.marginUsed -= amount; lp.marginAvailable += amount; lp.utilisation = (lp.marginUsed / lp.creditLine) * 100; }
  },

  // ── Reconciliation ───────────────────────────────────────────

  async runReconciliation() {
    if (this._hasBridge()) return this.bridge.runReconciliation(new Date().toISOString().slice(0, 10));
    const run = {
      id: 'RECON' + Date.now(), date: new Date(),
      status: S.reconciliation.breaks.length > 0 ? 'break' : 'matched',
      totalItems: S.reconciliation.items.length,
      matched: S.reconciliation.items.filter(i => i.status === 'matched').length,
      breaks: S.reconciliation.breaks.length, forcedMatch: 0,
      runDuration: U.randInt(5, 30) + 's', triggeredBy: 'Manual',
    };
    S.reconciliation.runs.unshift(run);
    S.reconciliation.currentRun = run;
    return run;
  },

  // ── Reporting ────────────────────────────────────────────────

  async getDailyPnl(dateRange) {
    if (this._hasBridge()) return this.bridge.getDailyPnl(dateRange?.from, dateRange?.to, dateRange?.book);
    return S.reporting.pnl.daily;
  },

  async getLPMarginReport() {
    if (this._hasBridge()) return this.bridge.getLPMarginReport();
    return S.reporting.lpMargin.current;
  },

  async getIBCommissions(period) {
    if (this._hasBridge()) return this.bridge.getIBCommissions(period);
    return S.reporting.ibCommissions.statements;
  },

  async getMonthlyAccounts(month) {
    if (this._hasBridge()) return this.bridge.getMonthlyAccounts(month);
    return S.reporting.pnl.daily; // Mock returns raw daily data
  },

  // ── Symbol / Platform ────────────────────────────────────────

  async getSymbols() {
    if (this._hasBridge()) return this.bridge.getSymbols();
    return S.platform.symbols;
  },

  async getSymbolSpec(symbol) {
    if (this._hasBridge()) return this.bridge.getSymbolSpec(symbol);
    return S.platform.symbols.find(s => s.symbol === symbol);
  },

  async updateSymbol(symbol, changes) {
    if (this._hasBridge()) return this.bridge.pushSymbolSpec(symbol, changes);
    const sym = S.platform.symbols.find(s => s.symbol === symbol);
    if (sym) Object.assign(sym, changes);
  },

  async addSymbol(spec) {
    if (this._hasBridge()) return this.bridge.addSymbol(spec);
    S.platform.symbols.push(spec);
  },

  async removeSymbol(symbol) {
    if (this._hasBridge()) return this.bridge.removeSymbol(symbol);
    S.platform.symbols = S.platform.symbols.filter(s => s.symbol !== symbol);
  },

  async enableSymbol(symbol) {
    if (this._hasBridge()) return this.bridge.enableSymbol(symbol);
    const sym = S.platform.symbols.find(s => s.symbol === symbol);
    if (sym) sym.enabled = true;
  },

  async disableSymbol(symbol) {
    if (this._hasBridge()) return this.bridge.disableSymbol(symbol);
    const sym = S.platform.symbols.find(s => s.symbol === symbol);
    if (sym) sym.enabled = false;
  },

  async getSwapSchedule() {
    if (this._hasBridge()) return this.bridge.getSwapSchedule();
    return S.trades.swapRollovers;
  },

  // ── Group Management ─────────────────────────────────────────

  async getGroups() {
    if (this._hasBridge()) return this.bridge.getGroups();
    return S.platform.leverageGroups;
  },

  async updateGroupConfig(name, changes) {
    if (this._hasBridge()) return this.bridge.updateGroupConfig(name, changes);
    const g = S.platform.leverageGroups.find(g => g.name === name);
    if (g) Object.assign(g, changes);
  },

  // ── Finance ──────────────────────────────────────────────────

  async getEMIAccounts() {
    if (this._hasBridge()) return this.bridge.getEMIAccounts();
    return S.finance.emiAccounts;
  },

  async executeTransfer(from, to, amount, currency) {
    if (this._hasBridge()) return this.bridge.executeTransfer(from, to, amount, currency);
    // Mock: just update state
    const transfer = { id: 'ET' + U.uid(), from, to, amount, currency, status: 'completed', completedAt: new Date() };
    S.finance.emiTransfers.push(transfer);
    return transfer;
  },

  async fundMarginCall(id) {
    if (this._hasBridge()) {
      const call = S.finance.lpMarginCalls.find(c => c.id === id);
      if (call) return this.bridge.fundMarginCall(call.lpId, call.amount, call.currency);
    }
    const c = S.finance.lpMarginCalls.find(x => x.id === id);
    if (c) c.status = 'funded';
  },

  async executeIBPayout(ibId, amount, currency, method) {
    if (this._hasBridge()) return this.bridge.executeIBPayout(ibId, amount, currency, method);
    const p = S.finance.ibPayouts.find(x => x.ibId === ibId);
    if (p) p.status = 'paid';
  },

  async getGatewaySettlements() {
    if (this._hasBridge()) return this.bridge.getGatewaySettlements();
    return S.finance.gatewaySettlements;
  },

  // ── Server ───────────────────────────────────────────────────

  async getServerHealth() {
    if (this._hasBridge()) return this.bridge.getServerHealth();
    return S.platform.serverHealth;
  },

  async getDetailedMetrics(name) {
    if (this._hasBridge()) return this.bridge.getDetailedMetrics(name);
    return S.platform.serverHealth.find(s => s.name === name);
  },

  async restartServer(name) {
    if (this._hasBridge()) return this.bridge.restartServer(name);
    const s = S.platform.serverHealth.find(x => x.name === name);
    if (s) { s.uptime = '0h'; s.lastRestart = new Date(); }
  },

  async setMaintenanceMode(name, enabled) {
    if (this._hasBridge()) return this.bridge.setMaintenanceMode(name, enabled);
    const s = S.platform.serverHealth.find(x => x.name === name);
    if (s) s.status = enabled ? 'maintenance' : 'healthy';
  },

  // ── Connection Info ──────────────────────────────────────────

  getBridgeStatus() {
    if (!this.bridge) return { type: 'mock', state: 'connected', latency: 0, ws: null };
    return {
      type: S.bridge.type,
      state: this.bridge.getConnectionState(),
      latency: this.bridge.getLatency(),
      lastError: this.bridge.getLastError(),
      lastPing: this.bridge._lastPing,
      ws: this.ws ? this.ws.getStatus() : null,
    };
  },
};

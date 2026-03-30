/**
 * API Service — mediates between the UI and bridge/mock data.
 * When a real bridge is connected, methods here call bridge adapter methods.
 * In mock mode, they return data from the global state S directly.
 */
const API = {
  bridge: null,

  async init() {
    if (CONFIG.BRIDGE.TYPE === 'mock') {
      Mock.init();
      S.bridge.connected = true;
      S.bridge.type = 'mock';
      return;
    }
    this.bridge = BridgeFactory.create(CONFIG.BRIDGE);
    if (this.bridge) {
      try {
        await this.bridge.connect();
        S.bridge.connected = this.bridge.isConnected();
        S.bridge.type = CONFIG.BRIDGE.TYPE;
      } catch (e) {
        console.error('[API] Bridge connection failed:', e);
        S.bridge.connected = false;
      }
    }
  },

  // --- Account Operations ---
  async getAccounts(filters) {
    if (this.bridge) return this.bridge.getAccounts(filters);
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
    if (this.bridge) return this.bridge.getAccountInfo(id);
    return S.accounts.list.find(a => a.id === id) || null;
  },

  async updateAccount(id, changes) {
    if (this.bridge) {
      if (changes.leverage) await this.bridge.setLeverage(id, changes.leverage);
      if (changes.group) await this.bridge.setGroup(id, changes.group);
      return;
    }
    const acc = S.accounts.list.find(a => a.id === id);
    if (acc) Object.assign(acc, changes);
  },

  // --- Deposits ---
  async getTransactions(filters) {
    let list = [...S.deposits.history];
    if (filters?.type && filters.type !== 'all') list = list.filter(t => t.type === filters.type);
    if (filters?.status && filters.status !== 'all') list = list.filter(t => t.status === filters.status);
    return list;
  },

  async approveTransaction(id) {
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) { txn.status = 'approved'; txn.processedAt = new Date(); txn.reviewedBy = 'Admin'; }
    S.deposits.pending = S.deposits.history.filter(t => ['pending','under_investigation'].includes(t.status));
  },

  async rejectTransaction(id, reason) {
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) { txn.status = 'rejected'; txn.processedAt = new Date(); txn.reviewedBy = 'Admin'; txn.notes = reason; }
    S.deposits.pending = S.deposits.history.filter(t => ['pending','under_investigation'].includes(t.status));
  },

  async investigateTransaction(id) {
    const txn = S.deposits.history.find(t => t.id === id);
    if (txn) txn.status = 'under_investigation';
  },

  // --- Trades ---
  async getTradeHistory(filters) {
    if (this.bridge && filters?.account) return this.bridge.getTradeHistory(filters.account, filters.dateFrom, filters.dateTo);
    let list = [...S.trades.history];
    if (filters?.account) list = list.filter(t => t.accountId === filters.account || String(t.accountLogin) === filters.account);
    if (filters?.symbol) list = list.filter(t => t.symbol === filters.symbol);
    return list;
  },

  // --- Dealing Desk ---
  async getLivePositions(filters) {
    if (this.bridge) return this.bridge.getLivePositions(filters?.login);
    let list = [...S.dealingDesk.livePositions];
    if (filters?.symbol && filters.symbol !== 'all') list = list.filter(p => p.symbol === filters.symbol);
    if (filters?.book && filters.book !== 'all') list = list.filter(p => p.book === filters.book);
    if (filters?.minSize) list = list.filter(p => p.volume >= filters.minSize);
    return list;
  },

  async closePosition(ticket) {
    if (this.bridge) return this.bridge.closePosition(ticket);
    S.dealingDesk.livePositions = S.dealingDesk.livePositions.filter(p => p.ticket !== ticket);
  },

  async rerouteAccount(accountId, newBook, reason) {
    const routing = S.dealingDesk.routing.find(r => r.accountId === accountId);
    if (routing) { routing.currentBook = newBook; routing.lastChanged = new Date(); routing.changedBy = 'Dealer'; routing.reason = reason; }
    const acc = S.accounts.list.find(a => a.id === accountId);
    if (acc) acc.book = newBook;
  },

  // --- LP ---
  async getLPs() { return S.lp.providers; },

  // --- Reconciliation ---
  async runReconciliation() {
    // Simulate a new run
    const run = {
      id: 'RECON' + Date.now(),
      date: new Date(),
      status: S.reconciliation.breaks.length > 0 ? 'break' : 'matched',
      totalItems: S.reconciliation.items.length,
      matched: S.reconciliation.items.filter(i => i.status === 'matched').length,
      breaks: S.reconciliation.breaks.length,
      forcedMatch: 0,
      runDuration: U.randInt(5, 30) + 's',
      triggeredBy: 'Manual',
    };
    S.reconciliation.runs.unshift(run);
    S.reconciliation.currentRun = run;
    return run;
  },

  // --- Reporting ---
  async getDailyPnl(dateRange) { return S.reporting.pnl.daily; },
  async getLPMarginReport() { return S.reporting.lpMargin.current; },
  async getIBCommissions(period) { return S.reporting.ibCommissions.statements; },

  // --- Platform ---
  async getSymbols() {
    if (this.bridge) return this.bridge.getSymbols();
    return S.platform.symbols;
  },

  async updateSymbol(symbol, changes) {
    if (this.bridge && changes.swapLong != null) return this.bridge.updateSwapRates(symbol, changes.swapLong, changes.swapShort);
    const sym = S.platform.symbols.find(s => s.symbol === symbol);
    if (sym) Object.assign(sym, changes);
  },

  // --- Finance ---
  async getEMIAccounts() { return S.finance.emiAccounts; },
  async getGatewaySettlements() { return S.finance.gatewaySettlements; },
};

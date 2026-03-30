/**
 * Centralized application state.
 * All modules read/write from this object.
 * Bridge adapters populate this; renderers consume it.
 */
const S = {
  // Current view
  currentView: 'dashboard',
  previousView: null,

  // Bridge connection
  bridge: {
    connected: false,
    type: CONFIG.BRIDGE.TYPE,
    state: 'disconnected',    // disconnected | connecting | connected | reconnecting | error
    lastPing: null,
    latency: 0,
    lastError: null,
    wsState: 'none',          // none | connecting | connected | reconnecting
    wsChannels: [],
    reconnectAttempts: 0,
  },

  // Dashboard KPIs
  dashboard: {
    totalAccounts: 0,
    activeAccounts: 0,
    totalEquity: 0,
    totalExposure: 0,
    dailyPnlA: 0,
    dailyPnlB: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    openPositions: 0,
    stopoutCandidates: 0,
    unrealizedPnl: 0,
    reconBreaks: 0,
    alerts: [],
  },

  // Account Management
  accounts: {
    list: [],
    filters: { status: 'all', book: 'all', search: '' },
    selected: null,
    page: 1,
    totalPages: 1,
  },

  // IB Management
  ib: {
    list: [],
    tree: [],
    selected: null,
    commissionRules: [],
    payouts: [],
    page: 1,
  },

  // Deposits & Withdrawals
  deposits: {
    pending: [],
    history: [],
    activeTab: 'deposits', // 'deposits' | 'withdrawals'
    filters: { status: 'pending', type: 'all' },
    page: 1,
  },

  // Trade Administration
  trades: {
    history: [],
    swapRollovers: [],
    dividendAdjustments: [],
    corporateActions: [],
    disputes: [],
    pending: [],              // pending/conditional orders
    rejected: [],             // rejected/failed order log
    filters: { account: '', symbol: '', dateFrom: '', dateTo: '' },
    activeTab: 'history',
    page: 1,
  },

  // Reconciliation
  reconciliation: {
    runs: [],
    currentRun: null,
    items: [],
    breaks: [],
    filters: { status: 'all', date: '' },
  },

  // Reporting
  reporting: {
    pnl: { daily: [], dateRange: '30d', bookFilter: 'all' },
    lpMargin: { snapshots: [], current: [] },
    ibCommissions: { statements: [], period: 'current_month' },
    monthly: { accounts: [], month: '' },
  },

  // Dealing Desk
  dealingDesk: {
    livePositions: [],
    exposure: {},
    routing: [],
    requotes: [],
    newsEvents: [],
    stopoutQueue: [],
    filters: { symbol: 'all', book: 'all', minSize: 0 },
  },

  // LP Management
  lp: {
    providers: [],
    sessions: [],
    marginTopups: [],
    selected: null,
  },

  // Platform Management
  platform: {
    symbols: [],
    leverageGroups: [],
    tradingHours: {},
    serverHealth: [],
  },

  // Finance Operations
  finance: {
    emiAccounts: [],
    emiTransfers: [],
    lpMarginCalls: [],
    gatewaySettlements: [],
    ibPayouts: [],
  },

  // Ruin Analysis
  ruin: {
    selectedAccount: null,
    simulation: null,
    porCurve: null,
    sizingComparison: null,
    params: {
      days: 252,
      paths: 500,
      ruinThreshold: 0.1,
      sizing: 'fixed_lot',
      riskPercent: 2,
    },
  },

  // Audit trail (recent)
  audit: [],

  // Notifications
  notifications: [],
};

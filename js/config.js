/**
 * Back Office Configuration
 * All bridge endpoints and thresholds configured here.
 * Swap bridge URLs when connecting to a real bridge.
 */
const CONFIG = {
  // Bridge connection
  BRIDGE: {
    TYPE: 'mock',               // 'mock' | 'metaapi' | 'fix' | 'direct_mt5' | 'custom'
    URL: '',                    // Bridge REST endpoint base URL
    WS_URL: '',                 // Bridge WebSocket endpoint
    API_KEY: '',                // Bridge API key / auth token
    ENVIRONMENT: 'live',        // 'live' | 'demo' | 'paper'
    API_VERSION: 'v1',          // API version for URL prefix

    // Connection settings
    CONNECT_TIMEOUT: 10000,     // ms — initial connection timeout
    REQUEST_TIMEOUT: 15000,     // ms — per-request timeout
    PING_INTERVAL: 30000,       // ms — latency measurement interval

    // Reconnection (WebSocket)
    RECONNECT_DELAY: 3000,      // ms — base delay before first reconnect
    MAX_RECONNECT: 10,          // max reconnect attempts before fallback
    BACKOFF_MULTIPLIER: 1.5,    // exponential backoff multiplier
    MAX_RECONNECT_DELAY: 30000, // ms — cap on backoff delay

    // WebSocket heartbeat
    HEARTBEAT_INTERVAL: 15000,  // ms — ping interval
    PING_TIMEOUT: 5000,         // ms — pong wait before declaring dead

    // Retry policy (REST)
    RETRY_ATTEMPTS: 3,          // retries on 5xx / network error
    RETRY_DELAY: 1000,          // ms — base retry delay

    // Failover
    FAILOVER_URL: '',           // backup bridge URL (auto-switch on failure)
    FAILOVER_WS_URL: '',        // backup WebSocket URL

    // Security
    TLS_VERIFY: true,           // verify TLS certificates
  },

  // Back Office API (your own server, if any)
  API: {
    BASE_URL: '',
    TOKEN: '',
  },

  // Polling intervals (ms)
  INTERVALS: {
    POSITIONS: 2000,            // Live positions refresh
    EXPOSURE: 3000,             // Exposure calc
    LP_HEALTH: 5000,            // LP session health
    SERVER_HEALTH: 30000,       // Server metrics
    PNL: 60000,                 // P&L refresh
    MOCK_TICK: 3000,            // Mock data tick rate
  },

  // Risk thresholds
  THRESHOLDS: {
    EXPOSURE_WARNING: 70,       // % of limit
    EXPOSURE_CRITICAL: 90,
    MARGIN_LEVEL_WARNING: 200,  // % margin level
    MARGIN_LEVEL_DANGER: 150,
    STOPOUT_LEVEL: 50,          // % stop-out trigger
    LARGE_ACCOUNT_EQUITY: 100000, // $ for large account review
    SLIPPAGE_WARNING: 2,        // pips
    LATENCY_WARNING: 50,        // ms
    LATENCY_CRITICAL: 200,
  },

  // Book routing defaults
  ROUTING: {
    TOXICITY_A_BOOK: 70,        // Score above this → A-book
    TOXICITY_B_BOOK: 30,        // Score below this → B-book
    // Between these → review
  },

  // Probability of Ruin settings
  RUIN: {
    POR_A_BOOK: 0.15,           // PoR below this + positive edge → A-book
    POR_B_BOOK: 0.60,           // PoR above this or negative edge → B-book
    DEFAULT_RUIN_THRESHOLD: 0.1, // 10% of starting capital = "ruined"
    MC_PATHS: 500,
    MC_DAYS: 252,               // 1 trading year
    CAPITAL_SWEEP_MIN: 1000,
    CAPITAL_SWEEP_MAX: 100000,
    CAPITAL_SWEEP_STEPS: 50,
  },

  // EMI accounts
  EMIS: ['EMI_GBP_01', 'EMI_USD_01', 'EMI_EUR_01'],

  // Timezone clocks
  CLOCKS: [
    { label: 'NY', tz: 'America/New_York' },
    { label: 'LN', tz: 'Europe/London' },
    { label: 'SG', tz: 'Asia/Singapore' },
    { label: 'SYD', tz: 'Australia/Sydney' },
  ],

  // Supported platforms
  PLATFORMS: ['MT5', 'MT4', 'cTrader'],

  // Default page size for tables
  PAGE_SIZE: 25,
};

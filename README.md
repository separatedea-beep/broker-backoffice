# Broker Back Office

Full-stack back office tool for CFD brokers. Covers everything after a trade is made — account management, trade administration, reconciliation, reporting, dealing desk operations, LP management, platform management, and finance operations.

Built as vanilla HTML/CSS/JS with zero framework dependencies. Bridge-agnostic — plug in any MT4/MT5 bridge, FIX engine, or custom API.

## Quick Start

```bash
cd backoffice
npx live-server --port=3001
```

Opens at `http://localhost:3001`. Runs in mock mode by default with simulated broker data.

## Connecting a Real Bridge

Edit `js/config.js`:

```javascript
BRIDGE: {
  TYPE: 'metaapi',              // 'mock' | 'metaapi' | 'fix' | 'direct_mt5' | 'custom'
  URL: 'https://your-bridge.com/api',
  WS_URL: 'wss://your-bridge.com/ws',
  API_KEY: 'your-api-key',
}
```

Then implement the adapter methods in `js/services/bridge.js` for your bridge. The UI works unchanged.

## Modules

### Account Management
- Open/close client accounts
- Adjust leverage, credit, bonuses
- KYC status tracking
- Account detail with full trade/transaction history
- Risk analytics with Probability of Ruin scoring

### IB (Introducing Broker) Management
- Hierarchical IB tree with sub-IBs
- Commission models: spread share, lot rebate, revenue share, CPA, hybrid
- Payout tracking and processing
- Per-IB client and volume reporting

### Deposits & Withdrawals
- Approval queue with approve/reject/investigate workflow
- Risk flags (large amount, new account, velocity, country risk)
- Payment method and gateway tracking
- Full transaction history with export

### Trade Administration
- Complete trade history with LP, slippage, latency data
- Swap rate management and daily rollovers
- Dividend adjustments on equity CFDs
- Corporate action processing (stock splits, mergers)
- Dispute resolution with compensation tracking

### Reconciliation
- Three-way match: MT5 vs LP confirmations vs EMI cash balance
- Break detection with investigation workflow
- Force-match with audit trail
- 14-day run history

### Reporting
- Daily P&L by book (A-Book vs B-Book) with charts
- Revenue breakdown: spread, commission, swap
- LP margin utilisation reports
- IB commission statements
- Monthly management accounts (full P&L)

### Dealing Desk
- Live position monitor with real-time P&L (auto-refreshing)
- Net exposure heatmap by symbol
- A/B book routing with PoR-enhanced recommendations
- Requote and slippage analysis
- News event risk management (spread/margin multipliers)
- Stop-out review queue for large accounts

### Probability of Ruin Engine
- Monte Carlo simulation (500 paths, 252 trading days)
- Analytical PoR formula with capital sweep
- Position sizing comparison: Fixed Lot, Fixed Fractional, Half Kelly, Full Kelly
- Composite A/B book routing score using 7 factors:
  - Edge per trade, Profit Factor, Risk-Reward ratio
  - Sharpe ratio, Max Drawdown, Return Volatility, PoR
- PoR as a function of starting capital chart

### LP Management
- LP overview with latency, fill rates, rejection rates
- Margin top-up requests with approval workflow
- FIX session health monitoring and event log

### Platform Management
- Symbol CRUD (enable/disable, edit specs)
- Swap rate editor
- Leverage group manager with per-symbol overrides
- Trading hours configuration
- Server health monitoring (CPU, memory, disk, connections)

### Finance Operations
- EMI account management with segregation checks
- Inter-EMI transfers with dual approval
- LP margin call tracking and funding
- Payment gateway settlement reconciliation
- IB payout processing (bulk approve/pay)

## Architecture

```
backoffice/
├── index.html                  # Single page app shell
├── css/styles.css              # Design system (dark theme, 600+ lines)
├── js/
│   ├── config.js               # All configuration and thresholds
│   ├── state.js                # Centralized state object
│   ├── utils.js                # Formatters, DOM helpers
│   ├── app.js                  # Router, init, render loop
│   ├── services/
│   │   ├── bridge.js           # Bridge adapter pattern (abstract + stubs)
│   │   ├── mock.js             # Mock data generator
│   │   ├── api.js              # API service layer
│   │   └── ruin.js             # Probability of Ruin engine
│   ├── ui/
│   │   ├── sidebar.js          # Navigation
│   │   ├── header.js           # Clocks, bridge status
│   │   ├── modal.js            # Modal system
│   │   ├── toast.js            # Notifications
│   │   └── table.js            # Reusable data table
│   └── renderers/              # One file per module
│       ├── dashboard.js
│       ├── accounts.js
│       ├── ib.js
│       ├── deposits.js
│       ├── trades.js
│       ├── reconciliation.js
│       ├── reporting.js
│       ├── dealing-desk.js
│       ├── ruin.js
│       ├── lp.js
│       ├── platform.js
│       └── finance.js
```

## Bridge Adapter Interface

The `BridgeAdapter` class defines methods any bridge must implement:

| Category | Methods |
|----------|---------|
| Connection | `connect()`, `disconnect()`, `isConnected()` |
| Accounts | `getAccounts()`, `getAccountInfo()`, `setLeverage()`, `setGroup()`, `setCredit()` |
| Positions | `getLivePositions()`, `getExposure()`, `closePosition()`, `closeAllPositions()` |
| Trading | `placeTrade()`, `modifyOrder()` |
| History | `getTradeHistory()`, `getDealHistory()` |
| Symbols | `getSymbols()`, `updateSwapRates()`, `enableSymbol()`, `disableSymbol()` |
| Server | `getServerTime()`, `getServerHealth()`, `getOnlineUsers()` |

Included adapters: `MockBridge` (built-in), `MetaApiBridge`, `FixBridge`, `DirectMT5Bridge`, `CustomBridge`.

## Tech Stack

- Vanilla JavaScript (ES6+, no framework)
- CSS custom properties (dark theme)
- Chart.js 4.4.1 (CDN)
- Zero build step — just serve the files

## License

Proprietary. All rights reserved.

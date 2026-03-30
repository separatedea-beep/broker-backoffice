/**
 * Bridge Adapter — abstract interface for connecting to any trading platform bridge.
 *
 * Implementations:
 *   MockBridge   — built-in simulated data (default)
 *   MetaApiBridge — MetaApi cloud bridge
 *   FixBridge     — FIX protocol (stub)
 *   DirectMT5Bridge — MT5 Manager API (stub)
 *   CustomBridge  — your own REST/WS bridge
 *
 * To connect a real bridge:
 *   1. Set CONFIG.BRIDGE.TYPE to your bridge type
 *   2. Set CONFIG.BRIDGE.URL and CONFIG.BRIDGE.API_KEY
 *   3. Implement the adapter methods below
 *   4. Call BridgeFactory.create() — it returns the right adapter
 */

class BridgeAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this._listeners = {};
  }

  // --- Connection ---
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { this.connected = false; }
  isConnected() { return this.connected; }

  // --- Account Operations ---
  async getAccounts(filters) { throw new Error('Not implemented'); }
  async getAccountInfo(login) { throw new Error('Not implemented'); }
  async setLeverage(login, leverage) { throw new Error('Not implemented'); }
  async setGroup(login, group) { throw new Error('Not implemented'); }
  async setCredit(login, amount, comment) { throw new Error('Not implemented'); }
  async enableAccount(login) { throw new Error('Not implemented'); }
  async disableAccount(login) { throw new Error('Not implemented'); }

  // --- Positions & Exposure ---
  async getLivePositions(login) { throw new Error('Not implemented'); }
  async getExposure() { throw new Error('Not implemented'); }
  async closePosition(ticket) { throw new Error('Not implemented'); }
  async closeAllPositions(login) { throw new Error('Not implemented'); }
  async partialClose(ticket, volume) { throw new Error('Not implemented'); }

  // --- Trade Execution ---
  async placeTrade(params) { throw new Error('Not implemented'); }
  async modifyOrder(ticket, sl, tp) { throw new Error('Not implemented'); }

  // --- Trade History ---
  async getTradeHistory(login, from, to) { throw new Error('Not implemented'); }
  async getDealHistory(login, from, to) { throw new Error('Not implemented'); }

  // --- Symbol Management ---
  async getSymbols() { throw new Error('Not implemented'); }
  async getSymbolSpec(symbol) { throw new Error('Not implemented'); }
  async updateSwapRates(symbol, long, short) { throw new Error('Not implemented'); }
  async enableSymbol(symbol) { throw new Error('Not implemented'); }
  async disableSymbol(symbol) { throw new Error('Not implemented'); }

  // --- Server ---
  async getServerTime() { throw new Error('Not implemented'); }
  async getServerHealth() { throw new Error('Not implemented'); }
  async getOnlineUsers() { throw new Error('Not implemented'); }

  // --- Subscriptions (real-time) ---
  subscribe(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    };
  }
  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }
}

/**
 * MetaApi Bridge (stub — fill in with your MetaApi token + account IDs)
 */
class MetaApiBridge extends BridgeAdapter {
  async connect() {
    // Example: fetch(`${this.config.URL}/connect`, { headers: { 'auth-token': this.config.API_KEY }})
    console.log('[MetaApiBridge] Connect to', this.config.URL);
    this.connected = true;
  }
  // Implement each method by calling your MetaApi REST endpoints
}

/**
 * FIX Protocol Bridge (stub)
 */
class FixBridge extends BridgeAdapter {
  async connect() {
    console.log('[FixBridge] FIX connection not implemented — plug in your FIX engine here');
    this.connected = true;
  }
}

/**
 * Direct MT5 Manager API Bridge (stub)
 */
class DirectMT5Bridge extends BridgeAdapter {
  async connect() {
    console.log('[DirectMT5Bridge] Direct MT5 Manager API not implemented');
    this.connected = true;
  }
}

/**
 * Custom Bridge — extend this for any proprietary bridge
 */
class CustomBridge extends BridgeAdapter {
  async connect() {
    console.log('[CustomBridge] Custom bridge — implement your protocol here');
    this.connected = true;
  }
}

/**
 * Factory
 */
const BridgeFactory = {
  create(config) {
    switch (config.TYPE) {
      case 'metaapi': return new MetaApiBridge(config);
      case 'fix': return new FixBridge(config);
      case 'direct_mt5': return new DirectMT5Bridge(config);
      case 'custom': return new CustomBridge(config);
      case 'mock':
      default: return null; // MockBridge is handled separately
    }
  }
};

/**
 * Mock Data Provider — generates realistic broker back-office data.
 * Used when CONFIG.BRIDGE.TYPE === 'mock'.
 */
const Mock = {
  _symbols: ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD','US30','US500','NAS100','UK100','DE40','BTCUSD','ETHUSD','USOIL','UKOIL'],
  _names: ['James Wilson','Sarah Chen','Ahmed Al-Rashid','Maria Santos','Yuki Tanaka','Oliver Smith','Fatima Hassan','Liam O\'Brien','Priya Patel','Wei Zhang','Thomas Mueller','Ana Costa','Kenji Nakamura','Elena Volkov','Carlos Rivera','Sophie Martin','Raj Sharma','Emily Thompson','Hassan Ali','Nina Petrova','David Kim','Rachel Green','Mohammed Ibrahim','Julia Fischer','Leo Rossi','Alex Morgan','Hana Sato','Victor Hugo','Chloe Dubois','Ryan O\'Connor'],
  _countries: ['GB','US','AE','SG','AU','DE','JP','FR','IN','BR','ZA','HK','CA','NZ','CH'],
  _payMethods: ['Bank Wire','Credit Card','Skrill','Neteller','Crypto (BTC)','Crypto (USDT)','Local Bank'],
  _lpNames: ['LP Alpha','LP Bravo','LP Charlie','LP Delta','LP Echo'],
  _ibNames: ['FinanceHub IB','TradeMaster IB','FX Partners IB','Capital Connect IB','Prime Referrals IB','Asia Markets IB','Euro Finance IB','Global Trade IB'],
  _groups: ['Standard','Premium','VIP','ECN','Pro','Islamic'],
  _emiProviders: ['EMI GBP Primary','EMI USD Primary','EMI EUR Primary'],
  _gateways: ['Stripe','PayPal','Adyen','Checkout.com','Crypto Processor'],

  init() {
    this._generateAccounts();
    this._generateIBs();
    this._generateDeposits();
    this._generateTrades();
    this._generateReconciliation();
    this._generateReporting();
    this._generateDealingDesk();
    this._generateLPs();
    this._generatePlatform();
    this._generateFinance();
    this._generateDashboard();
  },

  _generateAccounts() {
    S.accounts.list = this._names.map((name, i) => ({
      id: 'ACC' + (10001 + i),
      login: 50001 + i,
      name,
      email: name.toLowerCase().replace(/[^a-z]/g, '') + '@email.com',
      country: U.pick(this._countries),
      platform: U.pick(['MT5', 'MT4']),
      group: U.pick(this._groups),
      status: U.pick(['active','active','active','active','active','suspended','pending_review','closed']),
      book: U.pick(['a_book','b_book','b_book','b_book']),
      leverage: U.pick([100, 200, 300, 500]),
      balance: U.rand(500, 250000),
      equity: 0,
      credit: U.rand(0, 5000),
      bonus: U.rand(0, 2000),
      margin: 0,
      freeMargin: 0,
      marginLevel: 0,
      openPositions: U.randInt(0, 15),
      riskScore: U.randInt(10, 95),
      toxicity: U.randInt(5, 95),
      ibId: Math.random() > 0.4 ? 'IB' + U.randInt(1, 8) : null,
      kycStatus: U.pick(['verified','verified','verified','pending','rejected']),
      createdAt: new Date(Date.now() - U.randInt(30, 730) * 86400000),
      lastLogin: new Date(Date.now() - U.randInt(0, 30) * 86400000),
      lastTrade: new Date(Date.now() - U.randInt(0, 14) * 86400000),
    }));
    S.accounts.list.forEach(a => {
      a.equity = a.balance + U.rand(-a.balance * 0.2, a.balance * 0.3);
      a.margin = a.equity * U.rand(0.05, 0.6);
      a.freeMargin = a.equity - a.margin;
      a.marginLevel = a.margin > 0 ? (a.equity / a.margin) * 100 : 9999;

      // Trader performance stats (for Probability of Ruin analysis)
      a.totalTrades = U.randInt(50, 2000);
      a.winRate = U.rand(0.30, 0.72);
      a.avgWin = U.rand(50, 500);
      a.avgLoss = U.rand(40, 450);
      a.tradeFrequency = U.rand(0.5, 12); // trades per day
      a.profitFactor = (a.winRate * a.avgWin) / ((1 - a.winRate) * a.avgLoss);
      a.edgePerTrade = RuinEngine.edgePerTrade(a.winRate, a.avgWin, a.avgLoss);
      a.edgePerDay = a.edgePerTrade * a.tradeFrequency;
      a.kellyFraction = RuinEngine.kellyCriterion(a.winRate, a.avgWin, a.avgLoss);
      a.sharpeRatio = a.edgePerDay / (Math.sqrt(a.tradeFrequency) * (a.avgWin + a.avgLoss) / 2) * Math.sqrt(252);
      a.maxDrawdown = U.rand(0.05, 0.60);

      // Compute PoR for current balance
      const routing = RuinEngine.routingRecommendation(a);
      a.por = routing.por;
      a.porRecommendation = routing.recommendation;
      a.porReason = routing.reason;
    });
    S.accounts.totalPages = Math.ceil(S.accounts.list.length / CONFIG.PAGE_SIZE);
  },

  _generateIBs() {
    S.ib.list = this._ibNames.map((name, i) => ({
      id: 'IB' + (i + 1),
      name,
      contactEmail: name.toLowerCase().replace(/[^a-z]/g, '') + '@ib.com',
      commissionType: U.pick(['spread_share','lot_rebate','revenue_share','cpa','hybrid']),
      commissionRate: U.rand(0.2, 3.0),
      currency: 'USD',
      totalClients: U.randInt(5, 120),
      activeClients: 0,
      totalVolume: U.rand(50000, 5000000),
      totalCommissions: U.rand(5000, 250000),
      unpaidCommissions: U.rand(500, 25000),
      payoutMethod: U.pick(['Bank Wire','Skrill','Account Credit']),
      status: U.pick(['active','active','active','suspended']),
      parentIbId: i > 3 ? 'IB' + U.randInt(1, 4) : null,
      createdAt: new Date(Date.now() - U.randInt(90, 730) * 86400000),
    }));
    S.ib.list.forEach(ib => { ib.activeClients = Math.floor(ib.totalClients * U.rand(0.5, 0.9)); });
  },

  _generateDeposits() {
    const txns = [];
    for (let i = 0; i < 60; i++) {
      const isDeposit = Math.random() > 0.4;
      txns.push({
        id: 'TXN' + (100001 + i),
        accountId: 'ACC' + (10001 + U.randInt(0, 29)),
        accountName: U.pick(this._names),
        type: isDeposit ? 'deposit' : 'withdrawal',
        amount: U.rand(100, 50000),
        currency: U.pick(['USD','EUR','GBP']),
        method: U.pick(this._payMethods),
        gateway: U.pick(this._gateways),
        gatewayRef: 'GW' + U.uid(),
        status: U.pick(['pending','pending','pending','approved','rejected','under_investigation','completed']),
        emiAccount: U.pick(this._emiProviders),
        riskFlags: Math.random() > 0.8 ? [U.pick(['Large amount','New account','Country risk','Velocity check'])] : [],
        ipAddress: `${U.randInt(1,255)}.${U.randInt(0,255)}.${U.randInt(0,255)}.${U.randInt(0,255)}`,
        notes: '',
        reviewedBy: null,
        createdAt: new Date(Date.now() - U.randInt(0, 60) * 86400000),
        processedAt: null,
      });
    }
    S.deposits.pending = txns.filter(t => ['pending','under_investigation'].includes(t.status));
    S.deposits.history = txns;
  },

  _generateTrades() {
    const trades = [];
    for (let i = 0; i < 200; i++) {
      const symbol = U.pick(this._symbols);
      const isForex = !['US30','US500','NAS100','UK100','DE40','BTCUSD','ETHUSD','USOIL','UKOIL','XAUUSD','XAGUSD'].includes(symbol);
      const volume = isForex ? U.rand(0.01, 10.0) : U.rand(0.1, 50.0);
      const openPrice = this._getBasePrice(symbol);
      const pips = U.rand(-80, 80);
      const pipValue = isForex ? 0.0001 : (symbol.includes('JPY') ? 0.01 : 0.01);
      const closePrice = openPrice + pips * pipValue;
      const direction = U.pick(['buy','sell']);
      const pnl = direction === 'buy' ? (closePrice - openPrice) * volume * (isForex ? 100000 : 1) : (openPrice - closePrice) * volume * (isForex ? 100000 : 1);
      const openTime = new Date(Date.now() - U.randInt(0, 90) * 86400000);
      const holdMs = U.randInt(60000, 86400000 * 14);

      trades.push({
        ticket: 1000001 + i,
        accountId: 'ACC' + (10001 + U.randInt(0, 29)),
        accountLogin: 50001 + U.randInt(0, 29),
        symbol,
        direction,
        volume: Math.round(volume * 100) / 100,
        openPrice: Math.round(openPrice * 100000) / 100000,
        closePrice: Math.round(closePrice * 100000) / 100000,
        sl: openPrice - (direction === 'buy' ? 1 : -1) * U.rand(10, 50) * pipValue,
        tp: openPrice + (direction === 'buy' ? 1 : -1) * U.rand(10, 80) * pipValue,
        pnl: Math.round(pnl * 100) / 100,
        commission: -Math.round(volume * U.rand(2, 7) * 100) / 100,
        swap: Math.round(U.rand(-20, 5) * 100) / 100,
        book: U.pick(['a_book','b_book','b_book']),
        lp: U.pick(this._lpNames),
        lpTicket: 'LP' + U.uid(),
        fillLatency: U.randInt(1, 150),
        slippage: U.rand(-3, 3),
        openTime,
        closeTime: new Date(openTime.getTime() + holdMs),
        status: 'closed',
        disputeFlag: Math.random() > 0.95,
      });
    }
    S.trades.history = trades.sort((a, b) => b.closeTime - a.closeTime);

    // Swap rollovers
    S.trades.swapRollovers = this._symbols.slice(0, 12).map(sym => ({
      symbol: sym,
      longSwap: U.rand(-15, 5),
      shortSwap: U.rand(-15, 5),
      tripleDay: U.pick(['Wednesday','Friday']),
      lastRollover: new Date(Date.now() - 86400000),
      positionsAffected: U.randInt(5, 80),
      totalSwapCharged: U.rand(-5000, -100),
    }));

    // Dividend adjustments
    S.trades.dividendAdjustments = [
      { id: 'DIV001', symbol: 'US500', exDate: U.date(new Date(Date.now() + 86400000 * 3)), amount: 1.25, currency: 'USD', status: 'pending', positionsAffected: 12 },
      { id: 'DIV002', symbol: 'UK100', exDate: U.date(new Date(Date.now() - 86400000)), amount: 0.85, currency: 'GBP', status: 'completed', positionsAffected: 8 },
      { id: 'DIV003', symbol: 'DE40', exDate: U.date(new Date(Date.now() + 86400000 * 7)), amount: 0.95, currency: 'EUR', status: 'pending', positionsAffected: 5 },
    ];

    // Corporate actions
    S.trades.corporateActions = [
      { id: 'CA001', symbol: 'US500', type: 'stock_split', ratio: '4:1', exDate: U.date(new Date(Date.now() + 86400000 * 14)), status: 'pending', notes: 'Pending split' },
      { id: 'CA002', symbol: 'NAS100', type: 'dividend', amount: 2.10, exDate: U.date(new Date(Date.now() - 86400000 * 5)), status: 'completed', notes: 'Processed' },
    ];

    // Disputes
    S.trades.disputes = [
      { id: 'DSP001', ticket: 1000015, accountId: 'ACC10005', symbol: 'XAUUSD', issue: 'Slippage on stop-loss exceeded 5 pips', status: 'open', priority: 'high', claimedLoss: 450, compensation: 0, openedAt: new Date(Date.now() - 86400000 * 2), assignedTo: 'Risk Team' },
      { id: 'DSP002', ticket: 1000042, accountId: 'ACC10012', symbol: 'EURUSD', issue: 'Trade not executed at requested price', status: 'investigating', priority: 'medium', claimedLoss: 120, compensation: 0, openedAt: new Date(Date.now() - 86400000 * 5), assignedTo: 'Dealing Desk' },
      { id: 'DSP003', ticket: 1000088, accountId: 'ACC10020', symbol: 'GBPJPY', issue: 'Requote during NFP', status: 'resolved_broker', priority: 'low', claimedLoss: 75, compensation: 0, openedAt: new Date(Date.now() - 86400000 * 10), assignedTo: 'Compliance' },
    ];
  },

  _generateReconciliation() {
    const runs = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const totalItems = U.randInt(80, 200);
      const breaks = i < 3 ? U.randInt(0, 5) : U.randInt(0, 3);
      runs.push({
        id: 'RECON' + (1000 + i),
        date: d,
        status: breaks === 0 ? 'matched' : 'break',
        totalItems,
        matched: totalItems - breaks,
        breaks,
        forcedMatch: U.randInt(0, 2),
        runDuration: U.randInt(5, 45) + 's',
        triggeredBy: U.pick(['Automated','Manual']),
      });
    }
    S.reconciliation.runs = runs;

    // Break items for most recent run
    S.reconciliation.items = [
      { id: 'RI001', type: 'Trade Count', mt5Value: 1247, lpValue: 1245, emiValue: null, variance: 2, status: 'break', reason: '2 trades missing from LP confirm' },
      { id: 'RI002', type: 'Net P&L', mt5Value: -42350.50, lpValue: -42350.50, emiValue: null, variance: 0, status: 'matched', reason: '' },
      { id: 'RI003', type: 'Commission', mt5Value: 8920.00, lpValue: 8915.50, emiValue: null, variance: 4.50, status: 'break', reason: 'Rounding difference' },
      { id: 'RI004', type: 'Swap Charges', mt5Value: -3210.75, lpValue: -3210.75, emiValue: null, variance: 0, status: 'matched', reason: '' },
      { id: 'RI005', type: 'Client Seg Funds', mt5Value: null, lpValue: null, emiValue: 2450000.00, variance: 0, status: 'matched', reason: 'Matches client equity total' },
      { id: 'RI006', type: 'Deposit Total', mt5Value: 125000.00, lpValue: null, emiValue: 125000.00, variance: 0, status: 'matched', reason: '' },
      { id: 'RI007', type: 'Withdrawal Total', mt5Value: 45000.00, lpValue: null, emiValue: 44500.00, variance: 500, status: 'break', reason: 'Pending withdrawal not yet reflected in EMI' },
      { id: 'RI008', type: 'Volume (lots)', mt5Value: 4521.30, lpValue: 4521.30, emiValue: null, variance: 0, status: 'matched', reason: '' },
    ];
    S.reconciliation.breaks = S.reconciliation.items.filter(it => it.status === 'break');
  },

  _generateReporting() {
    // Daily P&L (30 days)
    const pnl = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      pnl.push({
        date: d,
        aBookPnl: U.rand(-5000, 8000),
        bBookPnl: U.rand(-15000, 25000),
        spreadRevenue: U.rand(5000, 20000),
        commissionRevenue: U.rand(2000, 8000),
        swapRevenue: U.rand(-3000, 3000),
        ibCost: U.rand(1000, 5000),
        lpCost: U.rand(500, 3000),
      });
    }
    S.reporting.pnl.daily = pnl;

    // LP Margin snapshots
    S.reporting.lpMargin.current = this._lpNames.map(lp => ({
      lp,
      creditLine: U.rand(500000, 5000000),
      used: 0,
      available: 0,
      utilisation: 0,
    }));
    S.reporting.lpMargin.current.forEach(m => {
      m.used = m.creditLine * U.rand(0.2, 0.85);
      m.available = m.creditLine - m.used;
      m.utilisation = (m.used / m.creditLine) * 100;
    });

    // IB Commission statements
    S.reporting.ibCommissions.statements = S.ib.list.map(ib => ({
      ibId: ib.id,
      ibName: ib.name,
      period: 'Mar 2026',
      totalVolume: U.rand(10000, 500000),
      totalTrades: U.randInt(100, 5000),
      grossCommission: U.rand(1000, 30000),
      adjustments: U.rand(-500, 0),
      netCommission: 0,
      status: U.pick(['calculated','approved','paid']),
    }));
    S.reporting.ibCommissions.statements.forEach(s => { s.netCommission = s.grossCommission + s.adjustments; });
  },

  _generateDealingDesk() {
    // Live positions (simulated open positions)
    const positions = [];
    for (let i = 0; i < 45; i++) {
      const sym = U.pick(this._symbols);
      const price = this._getBasePrice(sym);
      const dir = U.pick(['buy','sell']);
      const vol = U.rand(0.1, 20);
      const unrealPnl = U.rand(-5000, 5000);
      positions.push({
        ticket: 2000001 + i,
        login: 50001 + U.randInt(0, 29),
        accountId: 'ACC' + (10001 + U.randInt(0, 29)),
        name: U.pick(this._names),
        symbol: sym,
        direction: dir,
        volume: Math.round(vol * 100) / 100,
        openPrice: price,
        currentPrice: price + (dir === 'buy' ? 1 : -1) * unrealPnl / (vol * 100000) * (sym.includes('JPY') ? 100 : 1),
        unrealizedPnl: Math.round(unrealPnl * 100) / 100,
        sl: price - (dir === 'buy' ? 1 : -1) * U.rand(0.001, 0.01),
        tp: price + (dir === 'buy' ? 1 : -1) * U.rand(0.001, 0.02),
        swap: U.rand(-50, 10),
        book: U.pick(['a_book','b_book','b_book']),
        lp: U.pick(this._lpNames),
        openTime: new Date(Date.now() - U.randInt(60000, 86400000 * 7)),
        marginLevel: U.rand(100, 2000),
      });
    }
    S.dealingDesk.livePositions = positions;

    // Exposure by symbol
    const exposure = {};
    this._symbols.forEach(sym => {
      const long = positions.filter(p => p.symbol === sym && p.direction === 'buy').reduce((s, p) => s + p.volume, 0);
      const short = positions.filter(p => p.symbol === sym && p.direction === 'sell').reduce((s, p) => s + p.volume, 0);
      if (long || short) {
        exposure[sym] = { long: Math.round(long * 100) / 100, short: Math.round(short * 100) / 100, net: Math.round((long - short) * 100) / 100 };
      }
    });
    S.dealingDesk.exposure = exposure;

    // Routing table — now uses PoR-based recommendation
    S.dealingDesk.routing = S.accounts.list.slice(0, 20).map(a => ({
      accountId: a.id,
      login: a.login,
      name: a.name,
      currentBook: a.book,
      toxicity: a.toxicity,
      por: a.por,
      edgePerTrade: a.edgePerTrade,
      kellyFraction: a.kellyFraction,
      winRate: a.winRate,
      recommendation: a.porRecommendation,
      lastChanged: new Date(Date.now() - U.randInt(1, 90) * 86400000),
      changedBy: U.pick(['System','Dealer','Risk']),
      reason: a.porReason,
    }));

    // Requotes
    S.dealingDesk.requotes = [];
    for (let i = 0; i < 15; i++) {
      const sym = U.pick(this._symbols);
      S.dealingDesk.requotes.push({
        id: 'RQ' + (1000 + i),
        ticket: 3000001 + i,
        login: 50001 + U.randInt(0, 29),
        symbol: sym,
        requestedPrice: this._getBasePrice(sym),
        offeredPrice: this._getBasePrice(sym) + U.rand(-0.0005, 0.0005),
        slippage: U.rand(-3, 3),
        direction: U.pick(['buy','sell']),
        volume: U.rand(0.1, 5),
        accepted: Math.random() > 0.3,
        reason: U.pick(['Price moved','Spread widened','LP rejection','Latency']),
        timestamp: new Date(Date.now() - U.randInt(0, 72) * 3600000),
      });
    }

    // News events
    S.dealingDesk.newsEvents = [
      { id: 'NE001', name: 'US Non-Farm Payrolls', time: new Date(Date.now() + 86400000 * 2 + 3600000 * 13.5), impact: 'high', spreadMultiplier: 3, marginMultiplier: 2, affectedSymbols: ['EURUSD','GBPUSD','USDJPY','XAUUSD','US30','NAS100'], status: 'scheduled' },
      { id: 'NE002', name: 'FOMC Rate Decision', time: new Date(Date.now() + 86400000 * 5 + 3600000 * 19), impact: 'high', spreadMultiplier: 5, marginMultiplier: 3, affectedSymbols: ['EURUSD','GBPUSD','USDJPY','XAUUSD','US30','NAS100','BTCUSD'], status: 'scheduled' },
      { id: 'NE003', name: 'ECB Press Conference', time: new Date(Date.now() + 86400000 * 8 + 3600000 * 12.75), impact: 'high', spreadMultiplier: 3, marginMultiplier: 2, affectedSymbols: ['EURUSD','EURGBP','EURJPY','DE40'], status: 'scheduled' },
      { id: 'NE004', name: 'UK CPI', time: new Date(Date.now() + 86400000 + 3600000 * 7), impact: 'medium', spreadMultiplier: 2, marginMultiplier: 1.5, affectedSymbols: ['GBPUSD','EURGBP','GBPJPY','UK100'], status: 'scheduled' },
    ];

    // Stop-out queue
    S.dealingDesk.stopoutQueue = S.accounts.list.filter(a => a.marginLevel < 200 && a.marginLevel > 0).map(a => ({
      accountId: a.id,
      login: a.login,
      name: a.name,
      equity: a.equity,
      margin: a.margin,
      marginLevel: a.marginLevel,
      unrealizedPnl: a.equity - a.balance,
      openPositions: a.openPositions,
      isLargeAccount: a.equity > CONFIG.THRESHOLDS.LARGE_ACCOUNT_EQUITY,
      reviewStatus: U.pick(['pending','approved','deferred']),
      lastUpdated: new Date(),
    }));
  },

  _generateLPs() {
    S.lp.providers = this._lpNames.map((name, i) => ({
      id: 'LP' + (i + 1),
      name,
      status: i < 4 ? 'connected' : U.pick(['connected','degraded','disconnected']),
      protocol: U.pick(['FIX 4.4','FIX 5.0','REST API']),
      creditLine: U.rand(500000, 5000000),
      marginUsed: 0,
      marginAvailable: 0,
      utilisation: 0,
      avgLatency: U.rand(2, 80),
      rejectionRate: U.rand(0, 5),
      fillRate: 0,
      uptime: U.rand(98, 99.99),
      dailyVolume: U.rand(10000, 500000),
      lastHeartbeat: new Date(Date.now() - U.randInt(0, 30) * 1000),
      sessionStart: new Date(Date.now() - U.randInt(1, 48) * 3600000),
      symbols: this._symbols.slice(0, U.randInt(10, 20)),
    }));
    S.lp.providers.forEach(lp => {
      lp.marginUsed = lp.creditLine * U.rand(0.2, 0.8);
      lp.marginAvailable = lp.creditLine - lp.marginUsed;
      lp.utilisation = (lp.marginUsed / lp.creditLine) * 100;
      lp.fillRate = 100 - lp.rejectionRate;
    });

    // Session logs
    S.lp.sessions = [];
    S.lp.providers.forEach(lp => {
      for (let i = 0; i < 10; i++) {
        S.lp.sessions.push({
          lpId: lp.id,
          lpName: lp.name,
          event: U.pick(['heartbeat','login','logout','reconnect','error','latency_spike']),
          latency: U.rand(1, 200),
          timestamp: new Date(Date.now() - U.randInt(0, 24) * 3600000),
          details: '',
        });
      }
    });

    // Margin top-ups
    S.lp.marginTopups = [
      { id: 'MT001', lpId: 'LP1', lpName: 'LP Alpha', amount: 250000, currency: 'USD', status: 'pending', requestedAt: new Date(Date.now() - 3600000), requestedBy: 'Risk Team', approvedBy: null },
      { id: 'MT002', lpId: 'LP3', lpName: 'LP Charlie', amount: 100000, currency: 'USD', status: 'funded', requestedAt: new Date(Date.now() - 86400000 * 2), requestedBy: 'Finance', approvedBy: 'CFO' },
    ];
  },

  _generatePlatform() {
    S.platform.symbols = this._symbols.map(sym => {
      const isForex = !['US30','US500','NAS100','UK100','DE40','BTCUSD','ETHUSD','USOIL','UKOIL','XAUUSD','XAGUSD'].includes(sym);
      return {
        symbol: sym,
        description: sym,
        type: isForex ? 'Forex' : sym.includes('USD') && (sym.startsWith('BTC') || sym.startsWith('ETH')) ? 'Crypto' : sym.includes('OIL') ? 'Energy' : sym.startsWith('XA') ? 'Metal' : 'Index',
        enabled: true,
        contractSize: isForex ? 100000 : 1,
        digits: isForex ? 5 : 2,
        spreadType: U.pick(['floating','fixed']),
        avgSpread: U.rand(0.5, 5),
        minLot: 0.01,
        maxLot: isForex ? 100 : 500,
        lotStep: 0.01,
        swapLong: U.rand(-15, 5),
        swapShort: U.rand(-15, 5),
        swapType: 'points',
        tripleSwapDay: U.pick([3, 5]), // Wed or Fri
        marginRate: U.rand(0.5, 10),
        sessions: isForex ? 'Mon 00:00 - Fri 23:59' : 'Mon 01:00 - Fri 22:00',
      };
    });

    S.platform.leverageGroups = this._groups.map(g => ({
      name: g,
      defaultLeverage: g === 'VIP' ? 500 : g === 'ECN' ? 200 : g === 'Pro' ? 300 : g === 'Islamic' ? 100 : 100,
      maxExposure: U.rand(500000, 5000000),
      accounts: U.randInt(5, 80),
      overrides: g === 'VIP' ? [{ symbol: 'XAUUSD', leverage: 200 }, { symbol: 'BTCUSD', leverage: 50 }] : [],
    }));

    S.platform.serverHealth = [
      { name: 'MT5-Live-01', status: 'healthy', cpu: U.rand(15, 45), memory: U.rand(40, 70), disk: U.rand(30, 60), connections: U.randInt(100, 800), uptime: '14d 7h', lastRestart: new Date(Date.now() - 86400000 * 14) },
      { name: 'MT5-Live-02', status: 'healthy', cpu: U.rand(10, 35), memory: U.rand(35, 65), disk: U.rand(25, 55), connections: U.randInt(50, 400), uptime: '14d 7h', lastRestart: new Date(Date.now() - 86400000 * 14) },
      { name: 'MT5-Demo', status: 'healthy', cpu: U.rand(5, 20), memory: U.rand(20, 40), disk: U.rand(15, 35), connections: U.randInt(20, 150), uptime: '30d 2h', lastRestart: new Date(Date.now() - 86400000 * 30) },
      { name: 'Bridge-Gateway', status: U.pick(['healthy','healthy','warning']), cpu: U.rand(20, 60), memory: U.rand(30, 70), disk: U.rand(10, 30), connections: U.randInt(10, 50), uptime: '7d 12h', lastRestart: new Date(Date.now() - 86400000 * 7) },
    ];
  },

  _generateFinance() {
    S.finance.emiAccounts = [
      { id: 'EMI01', name: 'EMI GBP Primary', provider: 'Banking Circle', currency: 'GBP', balance: 0, segregated: 0, operational: 0, lastReconciled: new Date(Date.now() - 86400000) },
      { id: 'EMI02', name: 'EMI USD Primary', provider: 'CurrencyCloud', currency: 'USD', balance: 0, segregated: 0, operational: 0, lastReconciled: new Date(Date.now() - 86400000) },
      { id: 'EMI03', name: 'EMI EUR Primary', provider: 'Modulr', currency: 'EUR', balance: 0, segregated: 0, operational: 0, lastReconciled: new Date(Date.now() - 86400000) },
    ];
    // Generate balances ensuring segregated <= total balance
    S.finance.emiAccounts[0].balance = U.rand(1200000, 2000000);
    S.finance.emiAccounts[0].segregated = S.finance.emiAccounts[0].balance * U.rand(0.6, 0.85);
    S.finance.emiAccounts[1].balance = U.rand(1800000, 3000000);
    S.finance.emiAccounts[1].segregated = S.finance.emiAccounts[1].balance * U.rand(0.65, 0.85);
    S.finance.emiAccounts[2].balance = U.rand(600000, 1000000);
    S.finance.emiAccounts[2].segregated = S.finance.emiAccounts[2].balance * U.rand(0.6, 0.8);
    S.finance.emiAccounts.forEach(e => { e.operational = e.balance - e.segregated; });

    S.finance.emiTransfers = [
      { id: 'ET001', from: 'EMI01', to: 'EMI02', fromName: 'EMI GBP Primary', toName: 'EMI USD Primary', amount: 100000, currency: 'GBP', status: 'completed', requestedBy: 'Finance', approvedBy: 'CFO', requestedAt: new Date(Date.now() - 86400000 * 3), completedAt: new Date(Date.now() - 86400000 * 2) },
      { id: 'ET002', from: 'EMI02', to: 'EMI03', fromName: 'EMI USD Primary', toName: 'EMI EUR Primary', amount: 50000, currency: 'USD', status: 'pending', requestedBy: 'Finance', approvedBy: null, requestedAt: new Date(Date.now() - 3600000), completedAt: null },
    ];

    S.finance.lpMarginCalls = [
      { id: 'MC001', lpId: 'LP1', lpName: 'LP Alpha', amount: 250000, currency: 'USD', dueDate: new Date(Date.now() + 86400000), status: 'pending', requestedAt: new Date(Date.now() - 3600000 * 6) },
      { id: 'MC002', lpId: 'LP3', lpName: 'LP Charlie', amount: 100000, currency: 'USD', dueDate: new Date(Date.now() - 86400000), status: 'overdue', requestedAt: new Date(Date.now() - 86400000 * 3) },
    ];

    S.finance.gatewaySettlements = this._gateways.map((gw, i) => ({
      id: 'GS' + (100 + i),
      gateway: gw,
      period: 'Mar 2026',
      totalDeposits: U.rand(50000, 500000),
      totalWithdrawals: U.rand(20000, 200000),
      fees: U.rand(500, 5000),
      netSettlement: 0,
      expectedAmount: 0,
      actualAmount: 0,
      variance: 0,
      status: U.pick(['reconciled','pending','discrepancy']),
      settledAt: Math.random() > 0.3 ? new Date(Date.now() - U.randInt(0, 7) * 86400000) : null,
    }));
    S.finance.gatewaySettlements.forEach(g => {
      g.netSettlement = g.totalDeposits - g.totalWithdrawals - g.fees;
      g.expectedAmount = g.netSettlement;
      g.actualAmount = g.status === 'discrepancy' ? g.expectedAmount * U.rand(0.95, 0.99) : g.expectedAmount;
      g.variance = g.expectedAmount - g.actualAmount;
    });

    S.finance.ibPayouts = S.ib.list.map(ib => ({
      ibId: ib.id,
      ibName: ib.name,
      period: 'Mar 2026',
      grossAmount: ib.unpaidCommissions,
      adjustments: U.rand(-200, 0),
      netAmount: 0,
      method: ib.payoutMethod,
      status: U.pick(['pending','approved','paid','on_hold']),
      scheduledDate: new Date(Date.now() + U.randInt(1, 7) * 86400000),
    }));
    S.finance.ibPayouts.forEach(p => { p.netAmount = p.grossAmount + p.adjustments; });
  },

  _generateDashboard() {
    const accts = S.accounts.list;
    S.dashboard.totalAccounts = accts.length;
    S.dashboard.activeAccounts = accts.filter(a => a.status === 'active').length;
    S.dashboard.totalEquity = accts.reduce((s, a) => s + a.equity, 0);
    S.dashboard.totalExposure = Object.values(S.dealingDesk.exposure).reduce((s, e) => s + Math.abs(e.net), 0);
    S.dashboard.dailyPnlA = S.reporting.pnl.daily.length ? S.reporting.pnl.daily[S.reporting.pnl.daily.length - 1].aBookPnl : 0;
    S.dashboard.dailyPnlB = S.reporting.pnl.daily.length ? S.reporting.pnl.daily[S.reporting.pnl.daily.length - 1].bBookPnl : 0;
    S.dashboard.pendingDeposits = S.deposits.pending.filter(t => t.type === 'deposit').length;
    S.dashboard.pendingWithdrawals = S.deposits.pending.filter(t => t.type === 'withdrawal').length;
    S.dashboard.openPositions = S.dealingDesk.livePositions.length;
    S.dashboard.stopoutCandidates = S.dealingDesk.stopoutQueue.length;
    S.dashboard.unrealizedPnl = S.dealingDesk.livePositions.reduce((s, p) => s + p.unrealizedPnl, 0);
    S.dashboard.reconBreaks = S.reconciliation.breaks.length;

    S.dashboard.alerts = [
      { level: 'critical', title: 'LP margin call due', message: 'LP Charlie margin call overdue by 1 day', time: new Date() },
      { level: 'warning', title: 'High exposure XAUUSD', message: 'Net B-book exposure on XAUUSD at 82% of limit', time: new Date(Date.now() - 1800000) },
      { level: 'warning', title: 'Pending large withdrawal', message: 'ACC10005 requesting $45,000 withdrawal', time: new Date(Date.now() - 3600000) },
      { level: 'info', title: 'Reconciliation complete', message: 'Daily recon completed with 2 breaks', time: new Date(Date.now() - 7200000) },
      { level: 'info', title: 'News event approaching', message: 'UK CPI release in 24h — spread multipliers active', time: new Date(Date.now() - 10800000) },
    ];
  },

  _getBasePrice(sym) {
    const prices = { EURUSD:1.0850, GBPUSD:1.2650, USDJPY:149.50, AUDUSD:0.6550, USDCAD:1.3580, NZDUSD:0.6120, EURGBP:0.8580, EURJPY:162.20, GBPJPY:189.10, XAUUSD:2650.00, XAGUSD:31.50, US30:42500, US500:5850, NAS100:20500, UK100:8200, DE40:18500, BTCUSD:87000, ETHUSD:3200, USOIL:78.50, UKOIL:82.30 };
    return prices[sym] || 1.0;
  },

  // Tick simulation — call periodically to jitter prices
  tick() {
    S.dealingDesk.livePositions.forEach(p => {
      const move = U.rand(-0.0005, 0.0005);
      p.currentPrice += move;
      p.unrealizedPnl += (p.direction === 'buy' ? move : -move) * p.volume * 100000;
      p.unrealizedPnl = Math.round(p.unrealizedPnl * 100) / 100;
    });
    // Recalc exposure
    const exposure = {};
    Mock._symbols.forEach(sym => {
      const long = S.dealingDesk.livePositions.filter(p => p.symbol === sym && p.direction === 'buy').reduce((s, p) => s + p.volume, 0);
      const short = S.dealingDesk.livePositions.filter(p => p.symbol === sym && p.direction === 'sell').reduce((s, p) => s + p.volume, 0);
      if (long || short) exposure[sym] = { long: Math.round(long * 100) / 100, short: Math.round(short * 100) / 100, net: Math.round((long - short) * 100) / 100 };
    });
    S.dealingDesk.exposure = exposure;
    S.dashboard.unrealizedPnl = S.dealingDesk.livePositions.reduce((s, p) => s + p.unrealizedPnl, 0);
    S.dashboard.openPositions = S.dealingDesk.livePositions.length;
  },
};

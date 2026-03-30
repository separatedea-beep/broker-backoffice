/**
 * Back Office Application — main entry point
 */
const BO = {
  _tickInterval: null,

  async init() {
    console.log('[BO] Initializing Back Office...');

    // Initialize API / Bridge
    await API.init();

    // Render chrome
    Sidebar.render();
    Header.render();

    // Navigate to dashboard
    this.navigate('dashboard');

    // Start live tick (mock mode)
    if (CONFIG.BRIDGE.TYPE === 'mock') {
      this._tickInterval = setInterval(() => {
        Mock.tick();
        // Only re-render dealing desk live data if it's the current view
        if (S.currentView === 'dealing-desk') {
          DealingDeskRenderer.render();
        }
        Header.updateBridgeStatus();
      }, CONFIG.INTERVALS.MOCK_TICK);
    }

    // Clock update
    setInterval(() => Header.updateClocks(), 30000);

    // Sidebar toggle
    U.$('#sidebar-toggle').onclick = () => {
      U.$('#app').classList.toggle('sidebar-collapsed');
    };

    // Modal overlay close on click outside
    U.$('#modal-overlay').onclick = (e) => {
      if (e.target.id === 'modal-overlay') Modal.close();
    };

    // Keyboard shortcut: Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Modal.close();
    });

    console.log('[BO] Ready. Bridge:', S.bridge.type, '| Connected:', S.bridge.connected);
  },

  navigate(viewId) {
    S.previousView = S.currentView;
    S.currentView = viewId;

    // Hide all views, show target
    U.$$('.view').forEach(v => v.classList.remove('active'));
    const target = U.$(`#view-${viewId}`);
    if (target) target.classList.add('active');

    // Update sidebar
    Sidebar.setActive(viewId);

    // Render
    this.renderCurrentView();
  },

  renderCurrentView() {
    const viewMap = {
      'dashboard': () => DashboardRenderer.render(),
      'accounts': () => AccountsRenderer.render(),
      'account-detail': () => AccountsRenderer.renderDetail(),
      'ib': () => IBRenderer.render(),
      'ib-detail': () => IBRenderer.renderDetail(),
      'deposits': () => DepositsRenderer.render(),
      'trades': () => TradesRenderer.render(),
      'swaps': () => TradesRenderer.renderSwaps(),
      'corporate-actions': () => TradesRenderer.renderCorporateActions(),
      'disputes': () => TradesRenderer.renderDisputes(),
      'reconciliation': () => ReconciliationRenderer.render(),
      'pnl': () => ReportingRenderer.renderPnl(),
      'lp-margin-report': () => ReportingRenderer.renderLPMargin(),
      'ib-commissions': () => ReportingRenderer.renderIBCommissions(),
      'monthly-accounts': () => ReportingRenderer.renderMonthly(),
      'dealing-desk': () => DealingDeskRenderer.render(),
      'rerouting': () => DealingDeskRenderer.renderRerouting(),
      'requotes': () => DealingDeskRenderer.renderRequotes(),
      'news-risk': () => DealingDeskRenderer.renderNews(),
      'stopout-review': () => DealingDeskRenderer.renderStopouts(),
      'ruin-analysis': () => RuinRenderer.render(),
      'lp-overview': () => LPRenderer.renderOverview(),
      'lp-margin': () => LPRenderer.renderMargin(),
      'lp-sessions': () => LPRenderer.renderSessions(),
      'symbols': () => PlatformRenderer.renderSymbols(),
      'leverage': () => PlatformRenderer.renderLeverage(),
      'trading-hours': () => PlatformRenderer.renderTradingHours(),
      'server-health': () => PlatformRenderer.renderServerHealth(),
      'emi': () => FinanceRenderer.renderEMI(),
      'lp-margin-calls': () => FinanceRenderer.renderMarginCalls(),
      'gateway-recon': () => FinanceRenderer.renderGatewayRecon(),
      'ib-payouts': () => FinanceRenderer.renderIBPayouts(),
    };

    const renderer = viewMap[S.currentView];
    if (renderer) renderer();
  },

  // Expose UI helpers globally
  ui: {
    closeModal: () => Modal.close(),
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => BO.init());

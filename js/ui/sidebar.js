/**
 * Sidebar navigation — grouped by module
 */
const Sidebar = {
  sections: [
    {
      label: 'Overview', icon: '&#9632;', items: [
        { id: 'dashboard', label: 'Dashboard', icon: '&#8962;' },
      ]
    },
    {
      label: 'Accounts', icon: '&#128100;', items: [
        { id: 'accounts', label: 'Client Accounts', icon: '&#128101;' },
        { id: 'ib', label: 'IB Management', icon: '&#128279;' },
        { id: 'deposits', label: 'Deposits / Withdrawals', icon: '&#128176;' },
      ]
    },
    {
      label: 'Trade Admin', icon: '&#128200;', items: [
        { id: 'trades', label: 'Trade History', icon: '&#128196;' },
        { id: 'swaps', label: 'Swaps & Rollovers', icon: '&#128260;' },
        { id: 'corporate-actions', label: 'Corporate Actions', icon: '&#127970;' },
        { id: 'disputes', label: 'Disputes', icon: '&#9888;' },
      ]
    },
    {
      label: 'Reconciliation', icon: '&#9989;', items: [
        { id: 'reconciliation', label: 'Daily Recon', icon: '&#128269;' },
      ]
    },
    {
      label: 'Reporting', icon: '&#128202;', items: [
        { id: 'pnl', label: 'P&L by Book', icon: '&#128178;' },
        { id: 'lp-margin-report', label: 'LP Margin', icon: '&#128200;' },
        { id: 'ib-commissions', label: 'IB Commissions', icon: '&#128179;' },
        { id: 'monthly-accounts', label: 'Monthly Accounts', icon: '&#128197;' },
      ]
    },
    {
      label: 'Dealing Desk', icon: '&#127918;', items: [
        { id: 'dealing-desk', label: 'Live Monitor', icon: '&#128308;' },
        { id: 'rerouting', label: 'A/B Routing', icon: '&#128256;' },
        { id: 'requotes', label: 'Requotes & Slippage', icon: '&#128260;' },
        { id: 'news-risk', label: 'News & Events', icon: '&#128240;' },
        { id: 'stopout-review', label: 'Stop-Out Review', icon: '&#128721;' },
        { id: 'ruin-analysis', label: 'Ruin Analysis', icon: '&#128200;' },
      ]
    },
    {
      label: 'LP Management', icon: '&#127961;', items: [
        { id: 'lp-overview', label: 'LP Overview', icon: '&#128225;' },
        { id: 'lp-margin', label: 'Margin Top-Ups', icon: '&#128184;' },
        { id: 'lp-sessions', label: 'Session Health', icon: '&#128154;' },
      ]
    },
    {
      label: 'Platform', icon: '&#9881;', items: [
        { id: 'symbols', label: 'Symbols', icon: '&#128178;' },
        { id: 'leverage', label: 'Leverage Groups', icon: '&#128200;' },
        { id: 'trading-hours', label: 'Trading Hours', icon: '&#128336;' },
        { id: 'server-health', label: 'Server Health', icon: '&#128421;' },
      ]
    },
    {
      label: 'Finance', icon: '&#127974;', items: [
        { id: 'emi', label: 'EMI Accounts', icon: '&#127974;' },
        { id: 'lp-margin-calls', label: 'LP Margin Calls', icon: '&#128680;' },
        { id: 'gateway-recon', label: 'Gateway Settlements', icon: '&#128179;' },
        { id: 'ib-payouts', label: 'IB Payouts', icon: '&#128181;' },
      ]
    },
  ],

  render() {
    const nav = U.$('#sidebar-nav');
    nav.innerHTML = this.sections.map(sec => `
      <div class="nav-section">
        <div class="nav-section-label">${sec.label}</div>
        ${sec.items.map(item => `
          <a class="nav-item ${S.currentView === item.id ? 'active' : ''}" data-view="${item.id}" onclick="BO.navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        `).join('')}
      </div>
    `).join('');
  },

  setActive(viewId) {
    U.$$('.nav-item').forEach(el => el.classList.remove('active'));
    const active = U.$(`.nav-item[data-view="${viewId}"]`);
    if (active) active.classList.add('active');
  },
};

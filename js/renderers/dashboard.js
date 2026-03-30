/**
 * Dashboard — KPI cards, alerts, quick stats
 */
const DashboardRenderer = {
  render() {
    Header.setTitle('Dashboard');
    const d = S.dashboard;
    const totalPnl = d.dailyPnlA + d.dailyPnlB;

    const kpis = C.kpiGrid([
      C.kpi('Total Accounts', d.totalAccounts, `${d.activeAccounts} active`),
      C.kpi('Total Client Equity', U.money(d.totalEquity), `${d.openPositions} open positions`),
      C.kpiPnl('Daily P&L (A-Book)', d.dailyPnlA, 'Hedged flow'),
      C.kpiPnl('Daily P&L (B-Book)', d.dailyPnlB, 'Warehoused risk'),
      C.kpiPnl('Unrealized P&L', d.unrealizedPnl, 'Open position mark'),
      C.kpi('Pending Transactions', d.pendingDeposits + d.pendingWithdrawals,
        `${d.pendingDeposits} deposits, ${d.pendingWithdrawals} withdrawals`,
        { variant: d.pendingDeposits + d.pendingWithdrawals > 5 ? 'warning' : undefined }),
      C.kpi('Stop-Out Candidates', d.stopoutCandidates,
        `Below ${CONFIG.THRESHOLDS.MARGIN_LEVEL_WARNING}% margin`,
        { variant: d.stopoutCandidates > 0 ? 'danger' : undefined }),
      C.kpi('Recon Breaks', d.reconBreaks, "Today's reconciliation",
        { variant: d.reconBreaks > 0 ? 'warning' : undefined }),
    ]);

    const alertsCard = C.card('Alerts & Notifications', C.alertFeed(d.alerts));

    const exposureEntries = Object.entries(S.dealingDesk.exposure)
      .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
      .slice(0, 8);
    const exposureCard = C.card('Net B-Book Exposure (Top Symbols)',
      exposureEntries.map(([sym, e]) => C.exposureBar(sym, e)).join(''));

    const chartCard = C.card('30-Day P&L Trend',
      '<canvas id="dashboard-pnl-chart" height="200"></canvas>');

    U.$('#view-dashboard').innerHTML = `
      ${kpis}
      ${C.grid2(alertsCard, exposureCard)}
      ${chartCard}
    `;

    this._renderPnlChart();
  },

  _renderPnlChart() {
    const ctx = U.$('#dashboard-pnl-chart');
    if (!ctx) return;
    const days = S.reporting.pnl.daily;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map(d => U.date(d.date).slice(0, 6)),
        datasets: [
          { label: 'A-Book', data: days.map(d => d.aBookPnl), backgroundColor: 'rgba(59,130,246,0.7)' },
          { label: 'B-Book', data: days.map(d => d.bBookPnl), backgroundColor: 'rgba(168,85,247,0.7)' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 10 }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: { ticks: { color: '#64748b', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(148,163,184,0.08)' } },
        }
      }
    });
  },
};

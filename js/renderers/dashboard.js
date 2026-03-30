/**
 * Dashboard — KPI cards, alerts, quick stats
 */
const DashboardRenderer = {
  render() {
    Header.setTitle('Dashboard');
    const d = S.dashboard;
    const totalPnl = d.dailyPnlA + d.dailyPnlB;

    U.$('#view-dashboard').innerHTML = `
      <!-- KPI Cards Row 1 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Accounts</div>
          <div class="kpi-value">${d.totalAccounts}</div>
          <div class="kpi-sub">${d.activeAccounts} active</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Client Equity</div>
          <div class="kpi-value">${U.money(d.totalEquity)}</div>
          <div class="kpi-sub">${d.openPositions} open positions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Daily P&L (A-Book)</div>
          <div class="kpi-value ${U.pnlClass(d.dailyPnlA)}">${U.pnlSign(d.dailyPnlA)}${U.money(d.dailyPnlA)}</div>
          <div class="kpi-sub">Hedged flow</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Daily P&L (B-Book)</div>
          <div class="kpi-value ${U.pnlClass(d.dailyPnlB)}">${U.pnlSign(d.dailyPnlB)}${U.money(d.dailyPnlB)}</div>
          <div class="kpi-sub">Warehoused risk</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Unrealized P&L</div>
          <div class="kpi-value ${U.pnlClass(d.unrealizedPnl)}">${U.pnlSign(d.unrealizedPnl)}${U.money(d.unrealizedPnl)}</div>
          <div class="kpi-sub">Open position mark</div>
        </div>
        <div class="kpi-card ${d.pendingDeposits + d.pendingWithdrawals > 5 ? 'kpi-warning' : ''}">
          <div class="kpi-label">Pending Transactions</div>
          <div class="kpi-value">${d.pendingDeposits + d.pendingWithdrawals}</div>
          <div class="kpi-sub">${d.pendingDeposits} deposits, ${d.pendingWithdrawals} withdrawals</div>
        </div>
        <div class="kpi-card ${d.stopoutCandidates > 0 ? 'kpi-danger' : ''}">
          <div class="kpi-label">Stop-Out Candidates</div>
          <div class="kpi-value">${d.stopoutCandidates}</div>
          <div class="kpi-sub">Below ${CONFIG.THRESHOLDS.MARGIN_LEVEL_WARNING}% margin</div>
        </div>
        <div class="kpi-card ${d.reconBreaks > 0 ? 'kpi-warning' : ''}">
          <div class="kpi-label">Recon Breaks</div>
          <div class="kpi-value">${d.reconBreaks}</div>
          <div class="kpi-sub">Today's reconciliation</div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="grid-2col">
        <!-- Alerts -->
        <div class="card">
          <div class="card-header">
            <h3>Alerts & Notifications</h3>
          </div>
          <div class="card-body">
            ${d.alerts.map(a => `
              <div class="alert-item alert-${a.level}">
                <div class="alert-dot"></div>
                <div class="alert-content">
                  <div class="alert-title">${a.title}</div>
                  <div class="alert-message">${a.message}</div>
                </div>
                <div class="alert-time">${U.ago(a.time)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Quick Exposure -->
        <div class="card">
          <div class="card-header">
            <h3>Net B-Book Exposure (Top Symbols)</h3>
          </div>
          <div class="card-body">
            ${Object.entries(S.dealingDesk.exposure)
              .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
              .slice(0, 8)
              .map(([sym, e]) => `
                <div class="exposure-bar">
                  <span class="exposure-sym">${sym}</span>
                  <div class="exposure-visual">
                    <div class="exposure-fill ${e.net > 0 ? 'fill-long' : 'fill-short'}" style="width:${Math.min(Math.abs(e.net) / 20 * 100, 100)}%"></div>
                  </div>
                  <span class="exposure-val ${e.net > 0 ? 'positive' : 'negative'}">${e.net > 0 ? '+' : ''}${U.lots(e.net)} lots</span>
                </div>
              `).join('')}
          </div>
        </div>
      </div>

      <!-- P&L Sparkline -->
      <div class="card">
        <div class="card-header">
          <h3>30-Day P&L Trend</h3>
        </div>
        <div class="card-body chart-container">
          <canvas id="dashboard-pnl-chart" height="200"></canvas>
        </div>
      </div>
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

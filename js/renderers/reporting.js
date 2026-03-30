/**
 * Reporting — P&L, LP Margin, IB Commissions, Monthly Accounts
 */
const ReportingRenderer = {
  // Daily P&L by Book
  renderPnl() {
    Header.setTitle('P&L by Book');
    const days = S.reporting.pnl.daily;
    const totalA = days.reduce((s, d) => s + d.aBookPnl, 0);
    const totalB = days.reduce((s, d) => s + d.bBookPnl, 0);
    const totalSpread = days.reduce((s, d) => s + d.spreadRevenue, 0);
    const totalComm = days.reduce((s, d) => s + d.commissionRevenue, 0);
    const totalSwap = days.reduce((s, d) => s + d.swapRevenue, 0);

    U.$('#view-pnl').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">A-Book P&L (30d)</div><div class="kpi-value ${U.pnlClass(totalA)}">${U.pnlSign(totalA)}${U.money(totalA)}</div></div>
        <div class="kpi-card"><div class="kpi-label">B-Book P&L (30d)</div><div class="kpi-value ${U.pnlClass(totalB)}">${U.pnlSign(totalB)}${U.money(totalB)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Spread Revenue</div><div class="kpi-value">${U.money(totalSpread)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Commission Revenue</div><div class="kpi-value">${U.money(totalComm)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Swap Revenue</div><div class="kpi-value ${U.pnlClass(totalSwap)}">${U.pnlSign(totalSwap)}${U.money(totalSwap)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total P&L</div><div class="kpi-value ${U.pnlClass(totalA + totalB)}">${U.pnlSign(totalA + totalB)}${U.money(totalA + totalB)}</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Daily P&L — A-Book vs B-Book</h3></div>
        <div class="card-body chart-container"><canvas id="pnl-chart" height="300"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Revenue Breakdown</h3></div>
        <div class="card-body chart-container"><canvas id="revenue-chart" height="250"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Daily Detail</h3></div>
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Date</th><th class="text-right">A-Book</th><th class="text-right">B-Book</th><th class="text-right">Spread</th><th class="text-right">Commission</th><th class="text-right">Swap</th><th class="text-right">IB Cost</th><th class="text-right">LP Cost</th><th class="text-right">Net</th></tr></thead>
            <tbody>
              ${days.slice().reverse().map(d => {
                const net = d.aBookPnl + d.bBookPnl + d.spreadRevenue + d.commissionRevenue + d.swapRevenue - d.ibCost - d.lpCost;
                return `<tr>
                  <td>${U.date(d.date)}</td>
                  <td class="text-right ${U.pnlClass(d.aBookPnl)}">${U.money(d.aBookPnl)}</td>
                  <td class="text-right ${U.pnlClass(d.bBookPnl)}">${U.money(d.bBookPnl)}</td>
                  <td class="text-right">${U.money(d.spreadRevenue)}</td>
                  <td class="text-right">${U.money(d.commissionRevenue)}</td>
                  <td class="text-right ${U.pnlClass(d.swapRevenue)}">${U.money(d.swapRevenue)}</td>
                  <td class="text-right negative">${U.money(d.ibCost)}</td>
                  <td class="text-right negative">${U.money(d.lpCost)}</td>
                  <td class="text-right ${U.pnlClass(net)}"><strong>${U.money(net)}</strong></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // P&L Chart
    new Chart(U.$('#pnl-chart'), {
      type: 'bar',
      data: {
        labels: days.map(d => U.date(d.date).slice(0, 6)),
        datasets: [
          { label: 'A-Book', data: days.map(d => d.aBookPnl), backgroundColor: 'rgba(59,130,246,0.7)' },
          { label: 'B-Book', data: days.map(d => d.bBookPnl), backgroundColor: 'rgba(168,85,247,0.7)' },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.08)' } }, y: { ticks: { color: '#64748b', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(148,163,184,0.08)' } } } }
    });

    // Revenue Chart
    new Chart(U.$('#revenue-chart'), {
      type: 'line',
      data: {
        labels: days.map(d => U.date(d.date).slice(0, 6)),
        datasets: [
          { label: 'Spread', data: days.map(d => d.spreadRevenue), borderColor: '#22c55e', fill: false, tension: 0.3 },
          { label: 'Commission', data: days.map(d => d.commissionRevenue), borderColor: '#3b82f6', fill: false, tension: 0.3 },
          { label: 'Swap', data: days.map(d => d.swapRevenue), borderColor: '#f59e0b', fill: false, tension: 0.3 },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.08)' } }, y: { ticks: { color: '#64748b', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(148,163,184,0.08)' } } } }
    });
  },

  // LP Margin Utilisation
  renderLPMargin() {
    Header.setTitle('LP Margin Utilisation');
    const data = S.reporting.lpMargin.current;

    U.$('#view-lp-margin-report').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>LP Margin Utilisation</h3></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>LP</th><th class="text-right">Credit Line</th><th class="text-right">Used</th><th class="text-right">Available</th><th>Utilisation</th></tr></thead>
            <tbody>
              ${data.map(m => `<tr>
                <td><strong>${m.lp}</strong></td>
                <td class="text-right">${U.money(m.creditLine)}</td>
                <td class="text-right">${U.money(m.used)}</td>
                <td class="text-right">${U.money(m.available)}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill ${m.utilisation > CONFIG.THRESHOLDS.EXPOSURE_CRITICAL ? 'fill-danger' : m.utilisation > CONFIG.THRESHOLDS.EXPOSURE_WARNING ? 'fill-warning' : 'fill-success'}" style="width:${m.utilisation}%"></div>
                  </div>
                  <span class="text-sm">${U.pct(m.utilisation)}</span>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-body chart-container"><canvas id="lp-margin-chart" height="250"></canvas></div>
      </div>
    `;

    new Chart(U.$('#lp-margin-chart'), {
      type: 'doughnut',
      data: {
        labels: data.map(m => m.lp),
        datasets: [{ data: data.map(m => m.used), backgroundColor: ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
    });
  },

  // IB Commission Statements
  renderIBCommissions() {
    Header.setTitle('IB Commission Statements');
    const stmts = S.reporting.ibCommissions.statements;

    U.$('#view-ib-commissions').innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Total Gross</div><div class="kpi-value">${U.money(stmts.reduce((s,x) => s + x.grossCommission, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Net</div><div class="kpi-value">${U.money(stmts.reduce((s,x) => s + x.netCommission, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Trades</div><div class="kpi-value">${stmts.reduce((s,x) => s + x.totalTrades, 0).toLocaleString()}</div></div>
        <div class="kpi-card"><div class="kpi-label">Period</div><div class="kpi-value">${stmts[0]?.period || '-'}</div></div>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>IB</th><th class="text-right">Volume</th><th class="text-right">Trades</th><th class="text-right">Gross Comm.</th><th class="text-right">Adjustments</th><th class="text-right">Net Comm.</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${stmts.map(s => `<tr>
                <td><strong>${s.ibName}</strong></td>
                <td class="text-right">${U.money(s.totalVolume)}</td>
                <td class="text-right">${s.totalTrades.toLocaleString()}</td>
                <td class="text-right">${U.money(s.grossCommission)}</td>
                <td class="text-right negative">${U.money(s.adjustments)}</td>
                <td class="text-right"><strong>${U.money(s.netCommission)}</strong></td>
                <td><span class="badge ${U.statusClass(s.status)}">${s.status}</span></td>
                <td>
                  ${s.status === 'calculated' ? `<button class="btn btn-xs btn-success" onclick="ReportingRenderer.approveCommission('${s.ibId}')">Approve</button>` : ''}
                  <button class="btn btn-xs btn-secondary" onclick="Toast.info('PDF export coming soon')">PDF</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  approveCommission(ibId) {
    const stmt = S.reporting.ibCommissions.statements.find(s => s.ibId === ibId);
    if (stmt) stmt.status = 'approved';
    Toast.success('Commission statement approved');
    BO.renderCurrentView();
  },

  // Monthly Management Accounts
  renderMonthly() {
    Header.setTitle('Monthly Management Accounts');
    const days = S.reporting.pnl.daily;
    const totalRevenue = days.reduce((s, d) => s + d.spreadRevenue + d.commissionRevenue + d.swapRevenue, 0);
    const totalABook = days.reduce((s, d) => s + d.aBookPnl, 0);
    const totalBBook = days.reduce((s, d) => s + d.bBookPnl, 0);
    const totalIBCost = days.reduce((s, d) => s + d.ibCost, 0);
    const totalLPCost = days.reduce((s, d) => s + d.lpCost, 0);
    const grossProfit = totalRevenue + totalABook + totalBBook;
    const netProfit = grossProfit - totalIBCost - totalLPCost;

    U.$('#view-monthly-accounts').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Monthly P&L Summary — March 2026</h3></div>
        <div class="card-body">
          <table class="data-table">
            <tbody>
              <tr class="row-section"><td colspan="2"><strong>Revenue</strong></td></tr>
              <tr><td>Spread Revenue</td><td class="text-right">${U.money(days.reduce((s,d) => s + d.spreadRevenue, 0))}</td></tr>
              <tr><td>Commission Revenue</td><td class="text-right">${U.money(days.reduce((s,d) => s + d.commissionRevenue, 0))}</td></tr>
              <tr><td>Swap Revenue</td><td class="text-right">${U.money(days.reduce((s,d) => s + d.swapRevenue, 0))}</td></tr>
              <tr><td>A-Book P&L</td><td class="text-right ${U.pnlClass(totalABook)}">${U.money(totalABook)}</td></tr>
              <tr><td>B-Book P&L</td><td class="text-right ${U.pnlClass(totalBBook)}">${U.money(totalBBook)}</td></tr>
              <tr class="row-total"><td><strong>Total Revenue</strong></td><td class="text-right"><strong>${U.money(totalRevenue + totalABook + totalBBook)}</strong></td></tr>

              <tr class="row-section"><td colspan="2"><strong>Costs</strong></td></tr>
              <tr><td>IB Commissions</td><td class="text-right negative">(${U.money(totalIBCost)})</td></tr>
              <tr><td>LP Costs</td><td class="text-right negative">(${U.money(totalLPCost)})</td></tr>
              <tr><td>Infrastructure (est.)</td><td class="text-right negative">(${U.money(15000)})</td></tr>
              <tr><td>Staff (est.)</td><td class="text-right negative">(${U.money(25000)})</td></tr>
              <tr><td>Compliance (est.)</td><td class="text-right negative">(${U.money(8000)})</td></tr>
              <tr class="row-total"><td><strong>Total Costs</strong></td><td class="text-right negative"><strong>(${U.money(totalIBCost + totalLPCost + 48000)})</strong></td></tr>

              <tr class="row-grand-total"><td><strong>Net Profit</strong></td><td class="text-right ${U.pnlClass(netProfit - 48000)}"><strong>${U.money(netProfit - 48000)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
};

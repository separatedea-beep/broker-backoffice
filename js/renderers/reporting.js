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

    const kpis = C.kpiGrid([
      C.kpiPnl('A-Book P&L (30d)', totalA),
      C.kpiPnl('B-Book P&L (30d)', totalB),
      C.kpi('Spread Revenue', U.money(totalSpread)),
      C.kpi('Commission Revenue', U.money(totalComm)),
      C.kpiPnl('Swap Revenue', totalSwap),
      C.kpiPnl('Total P&L', totalA + totalB),
    ]);

    const pnlChartCard = C.card('Daily P&L \u2014 A-Book vs B-Book',
      '<div class="chart-container"><canvas id="pnl-chart" height="300"></canvas></div>');

    const revenueChartCard = C.card('Revenue Breakdown',
      '<div class="chart-container"><canvas id="revenue-chart" height="250"></canvas></div>');

    // Daily Detail table
    const detailRows = days.slice().reverse().map(d => {
      const net = d.aBookPnl + d.bBookPnl + d.spreadRevenue + d.commissionRevenue + d.swapRevenue - d.ibCost - d.lpCost;
      return `<tr>
        <td>${U.date(d.date)}</td>
        <td class="text-right">${C.pnl(d.aBookPnl)}</td>
        <td class="text-right">${C.pnl(d.bBookPnl)}</td>
        <td class="text-right">${U.money(d.spreadRevenue)}</td>
        <td class="text-right">${U.money(d.commissionRevenue)}</td>
        <td class="text-right">${C.pnl(d.swapRevenue)}</td>
        <td class="text-right negative">${U.money(d.ibCost)}</td>
        <td class="text-right negative">${U.money(d.lpCost)}</td>
        <td class="text-right">${C.pnlBold(net)}</td>
      </tr>`;
    });

    const detailTable = C.simpleTable(
      ['Date', 'A-Book', 'B-Book', 'Spread', 'Commission', 'Swap', 'IB Cost', 'LP Cost', 'Net'],
      detailRows,
      { compact: true }
    );

    const detailCard = C.card('Daily Detail', detailTable);

    U.$('#view-pnl').innerHTML = `
      ${kpis}
      ${pnlChartCard}
      ${revenueChartCard}
      ${detailCard}
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

    const lpRows = data.map(m => `<tr>
      <td><strong>${U.escape(m.lp)}</strong></td>
      <td class="text-right">${U.money(m.creditLine)}</td>
      <td class="text-right">${U.money(m.used)}</td>
      <td class="text-right">${U.money(m.available)}</td>
      <td>${C.progressBar(m.utilisation)}<span class="text-sm">${U.pct(m.utilisation)}</span></td>
    </tr>`);

    const lpTable = C.simpleTable(
      ['LP', 'Credit Line', 'Used', 'Available', 'Utilisation'],
      lpRows
    );

    const lpCard = C.card('LP Margin Utilisation', lpTable);

    const chartCard = C.card('', '<div class="chart-container"><canvas id="lp-margin-chart" height="250"></canvas></div>');

    U.$('#view-lp-margin-report').innerHTML = `
      ${lpCard}
      ${chartCard}
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

    const kpis = C.kpiGrid([
      C.kpi('Total Gross', U.money(stmts.reduce((s, x) => s + x.grossCommission, 0))),
      C.kpi('Total Net', U.money(stmts.reduce((s, x) => s + x.netCommission, 0))),
      C.kpi('Total Trades', stmts.reduce((s, x) => s + x.totalTrades, 0).toLocaleString()),
      C.kpi('Period', stmts[0]?.period || '-'),
    ], 4);

    const ibRows = stmts.map(s => `<tr>
      <td><strong>${U.escape(s.ibName)}</strong></td>
      <td class="text-right">${U.money(s.totalVolume)}</td>
      <td class="text-right">${s.totalTrades.toLocaleString()}</td>
      <td class="text-right">${U.money(s.grossCommission)}</td>
      <td class="text-right negative">${U.money(s.adjustments)}</td>
      <td class="text-right"><strong>${U.money(s.netCommission)}</strong></td>
      <td>${C.badge(s.status)}</td>
      <td>
        ${s.status === 'calculated' ? C.actionBtn('Approve', "ReportingRenderer.approveCommission('" + s.ibId + "')", 'success') : ''}
        ${C.actionBtn('PDF', "Toast.info('PDF export coming soon')")}
      </td>
    </tr>`);

    const ibTable = C.simpleTable(
      ['IB', 'Volume', 'Trades', 'Gross Comm.', 'Adjustments', 'Net Comm.', 'Status', 'Actions'],
      ibRows
    );

    const ibCard = C.card('', ibTable);

    U.$('#view-ib-commissions').innerHTML = `
      ${kpis}
      ${ibCard}
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

    const monthlyRows = [
      `<tr class="row-section"><td colspan="2"><strong>Revenue</strong></td></tr>`,
      `<tr><td>Spread Revenue</td><td class="text-right">${U.money(days.reduce((s, d) => s + d.spreadRevenue, 0))}</td></tr>`,
      `<tr><td>Commission Revenue</td><td class="text-right">${U.money(days.reduce((s, d) => s + d.commissionRevenue, 0))}</td></tr>`,
      `<tr><td>Swap Revenue</td><td class="text-right">${U.money(days.reduce((s, d) => s + d.swapRevenue, 0))}</td></tr>`,
      `<tr><td>A-Book P&L</td><td class="text-right">${C.pnl(totalABook)}</td></tr>`,
      `<tr><td>B-Book P&L</td><td class="text-right">${C.pnl(totalBBook)}</td></tr>`,
      `<tr class="row-total"><td><strong>Total Revenue</strong></td><td class="text-right"><strong>${U.money(totalRevenue + totalABook + totalBBook)}</strong></td></tr>`,

      `<tr class="row-section"><td colspan="2"><strong>Costs</strong></td></tr>`,
      `<tr><td>IB Commissions</td><td class="text-right negative">(${U.money(totalIBCost)})</td></tr>`,
      `<tr><td>LP Costs</td><td class="text-right negative">(${U.money(totalLPCost)})</td></tr>`,
      `<tr><td>Infrastructure (est.)</td><td class="text-right negative">(${U.money(15000)})</td></tr>`,
      `<tr><td>Staff (est.)</td><td class="text-right negative">(${U.money(25000)})</td></tr>`,
      `<tr><td>Compliance (est.)</td><td class="text-right negative">(${U.money(8000)})</td></tr>`,
      `<tr class="row-total"><td><strong>Total Costs</strong></td><td class="text-right negative"><strong>(${U.money(totalIBCost + totalLPCost + 48000)})</strong></td></tr>`,

      `<tr class="row-grand-total"><td><strong>Net Profit</strong></td><td class="text-right ${U.pnlClass(netProfit - 48000)}"><strong>${U.money(netProfit - 48000)}</strong></td></tr>`,
    ];

    const monthlyTable = C.simpleTable([], monthlyRows);

    const monthlyCard = C.card('Monthly P&L Summary \u2014 March 2026', monthlyTable);

    U.$('#view-monthly-accounts').innerHTML = monthlyCard;
  },
};

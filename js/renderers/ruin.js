/**
 * Ruin Analysis Renderer
 *
 * Full probability-of-ruin analysis for a selected trader:
 * - KPI cards: edge, Kelly, PoR, recommendation
 * - Monte Carlo equity curve chart (500 paths, percentile bands)
 * - PoR vs Starting Capital chart
 * - Position sizing comparison table
 * - Distribution stats
 */
const RuinRenderer = {
  _charts: {},

  render() {
    Header.setTitle('Probability of Ruin Analysis');
    const view = U.$('#view-ruin-analysis');
    const accounts = S.accounts.list.filter(a => a.status === 'active' && a.totalTrades > 0);
    const sel = S.ruin.selectedAccount;
    const p = S.ruin.params;

    const filterHtml = `
      <select id="ruin-account-select" class="form-control" style="min-width:250px" onchange="RuinRenderer.selectAccount(this.value)">
        <option value="">— Select a trader —</option>
        ${accounts.map(a => `<option value="${a.id}" ${sel && sel.id === a.id ? 'selected' : ''}>${a.login} — ${a.name} (${U.money(a.balance)})</option>`).join('')}
      </select>
      <select class="form-control form-sm" onchange="S.ruin.params.sizing=this.value; RuinRenderer.runAnalysis()">
        <option value="fixed_lot" ${p.sizing==='fixed_lot'?'selected':''}>Fixed Lot</option>
        <option value="fixed_fractional" ${p.sizing==='fixed_fractional'?'selected':''}>Fixed Fractional (${p.riskPercent}%)</option>
        <option value="half_kelly" ${p.sizing==='half_kelly'?'selected':''}>Half Kelly</option>
        <option value="kelly" ${p.sizing==='kelly'?'selected':''}>Full Kelly</option>
      </select>
      <select class="form-control form-sm" onchange="S.ruin.params.ruinThreshold=parseFloat(this.value); RuinRenderer.runAnalysis()">
        <option value="0.05" ${p.ruinThreshold===0.05?'selected':''}>Ruin = 5%</option>
        <option value="0.10" ${p.ruinThreshold===0.10?'selected':''}>Ruin = 10%</option>
        <option value="0.20" ${p.ruinThreshold===0.20?'selected':''}>Ruin = 20%</option>
        <option value="0.50" ${p.ruinThreshold===0.50?'selected':''}>Ruin = 50%</option>
      </select>`;

    const selectorCard = C.card('Select Trader', '', { filters: filterHtml });

    const placeholder = sel ? '' : C.card(null, C.emptyState('Select a trader above to run the analysis'));

    view.innerHTML = `${selectorCard}<div id="ruin-content">${placeholder}</div>`;

    if (sel) this.renderAnalysis();
  },

  selectAccount(id) {
    const acc = S.accounts.list.find(a => a.id === id);
    S.ruin.selectedAccount = acc || null;
    if (acc) this.runAnalysis();
    else this.render();
  },

  runAnalysis() {
    const acc = S.ruin.selectedAccount;
    if (!acc) return;
    const p = S.ruin.params;

    // Run Monte Carlo simulation
    S.ruin.simulation = RuinEngine.monteCarloRuin({
      startingCapital: acc.balance,
      winRate: acc.winRate,
      avgWin: acc.avgWin,
      avgLoss: acc.avgLoss,
      tradesPerDay: acc.tradeFrequency,
      days: p.days,
      paths: p.paths,
      ruinThreshold: p.ruinThreshold,
      sizing: p.sizing,
      riskPercent: p.riskPercent,
    });

    // PoR vs Capital curve
    S.ruin.porCurve = RuinEngine.porVsCapital({
      winRate: acc.winRate,
      avgWin: acc.avgWin,
      avgLoss: acc.avgLoss,
      capitalMin: CONFIG.RUIN.CAPITAL_SWEEP_MIN,
      capitalMax: Math.max(acc.balance * 3, CONFIG.RUIN.CAPITAL_SWEEP_MAX),
      steps: CONFIG.RUIN.CAPITAL_SWEEP_STEPS,
      ruinThreshold: p.ruinThreshold,
    });

    // Position sizing comparison
    S.ruin.sizingComparison = RuinEngine.compareSizing({
      startingCapital: acc.balance,
      winRate: acc.winRate,
      avgWin: acc.avgWin,
      avgLoss: acc.avgLoss,
      tradesPerDay: acc.tradeFrequency,
      days: p.days,
      ruinThreshold: p.ruinThreshold,
    });

    this.renderAnalysis();
  },

  renderAnalysis() {
    const acc = S.ruin.selectedAccount;
    const sim = S.ruin.simulation;
    const porCurve = S.ruin.porCurve;
    const sizing = S.ruin.sizingComparison;
    if (!acc || !sim) return;

    const edge = acc.edgePerTrade;
    const kelly = acc.kellyFraction;
    const routing = RuinEngine.routingRecommendation(acc);

    const recLabel = routing.recommendation === 'a_book' ? 'A-BOOK'
                   : routing.recommendation === 'b_book' ? 'B-BOOK' : 'REVIEW';
    const recBadgeCls = routing.recommendation === 'a_book' ? 'badge-info'
                      : routing.recommendation === 'b_book' ? 'badge-purple' : 'badge-warning';

    const porVariant = sim.probabilityOfRuin > 0.5 ? 'danger'
                     : sim.probabilityOfRuin > 0.2 ? 'warning' : 'success';

    const kpis = C.kpiGrid([
      C.kpi('Edge / Trade',
        `${edge >= 0 ? '+' : ''}${U.money(edge)}`,
        `${U.money(acc.edgePerDay)}/day (${U.num(acc.tradeFrequency, 1)} trades/day)`,
        { valueClass: edge >= 0 ? 'positive' : 'negative' }),
      C.kpi('Win Rate',
        U.pct(acc.winRate * 100),
        `Avg W: ${U.money(acc.avgWin)} / Avg L: ${U.money(acc.avgLoss)}`),
      C.kpi('Kelly Criterion',
        U.pct(kelly * 100),
        `Profit Factor: ${U.num(acc.profitFactor)}`),
      C.kpi('Probability of Ruin',
        U.pct(sim.probabilityOfRuin * 100),
        `${sim.ruinCount}/${sim.paths} paths hit ruin (${U.pct(S.ruin.params.ruinThreshold * 100)} threshold)`,
        { variant: porVariant }),
      C.kpi('Recommended Book',
        `<span class="badge ${recBadgeCls}" style="font-size:16px;padding:4px 12px">${recLabel}</span>`,
        `<span class="text-sm">${routing.reason}</span>`),
      C.kpi('Median Final Equity',
        U.money(sim.finalEquity.median),
        `5th: ${U.money(sim.finalEquity.p5)} / 95th: ${U.money(sim.finalEquity.p95)}`,
        { valueClass: sim.finalEquity.median > acc.balance ? 'positive' : 'negative' }),
      C.kpi('Expected Max Drawdown',
        U.pct(sim.maxDrawdown.mean * 100),
        `95th pct: ${U.pct(sim.maxDrawdown.p95 * 100)}`,
        { valueClass: 'negative' }),
      C.kpi('Sharpe Ratio (ann.)',
        U.num(acc.sharpeRatio),
        `${acc.totalTrades} total trades`,
        { valueClass: acc.sharpeRatio >= 0 ? 'positive' : 'negative' }),
    ]);

    // Charts row
    const mcChart = C.card(`Monte Carlo Equity Projection (${sim.paths} paths, ${sim.days}d)`,
      '<div class="chart-container" style="height:350px"><canvas id="ruin-mc-chart"></canvas></div>');
    const capitalChart = C.card('Probability of Ruin vs Starting Capital',
      '<div class="chart-container" style="height:350px"><canvas id="ruin-capital-chart"></canvas></div>');
    const chartsRow = C.grid2(mcChart, capitalChart);

    // Position sizing comparison table
    const sizingRows = sizing.map(s => {
      const assessment = s.por < 0.15 ? 'Conservative' : s.por < 0.40 ? 'Moderate' : s.por < 0.70 ? 'Aggressive' : 'Dangerous';
      const assessClass = s.por < 0.15 ? 'success' : s.por < 0.40 ? 'info' : s.por < 0.70 ? 'warning' : 'danger';
      return `<tr class="${s.name === this._currentSizingLabel() ? 'row-highlight' : ''}">
        <td><strong>${s.name}</strong></td>
        <td>${s.fraction}</td>
        <td class="text-right ${s.por > 0.5 ? 'text-danger' : s.por > 0.2 ? 'text-warning' : ''}">${U.pct(s.por * 100)}</td>
        <td class="text-right ${s.expectedReturn >= 0 ? 'positive' : 'negative'}">${s.expectedReturn >= 0 ? '+' : ''}${U.pct(s.expectedReturn)}</td>
        <td class="text-right">${U.money(s.medianFinal)}</td>
        <td class="text-right negative">${U.pct(s.meanMaxDD)}</td>
        <td class="text-right negative">${U.pct(s.p95MaxDD)}</td>
        <td>${C.badge(assessment, assessClass)}</td>
      </tr>`;
    });

    const sizingTable = C.simpleTable(
      ['Strategy', 'Risk Fraction', 'PoR', 'Expected Return', 'Median Final Equity', 'Avg Max DD', '95th Max DD', 'Assessment'],
      sizingRows);
    const sizingCard = C.card('Position Sizing Strategy Comparison', sizingTable);

    // Trader Profile
    const tradeDistribution = C.detailGrid([
      { label: 'Total Trades', value: acc.totalTrades },
      { label: 'Win Rate', value: U.pct(acc.winRate * 100) },
      { label: 'Avg Win', html: `<span class="positive">${U.money(acc.avgWin)}</span>` },
      { label: 'Avg Loss', html: `<span class="negative">${U.money(acc.avgLoss)}</span>` },
      { label: 'Win/Loss Ratio', value: U.num(acc.avgWin / acc.avgLoss) },
      { label: 'Profit Factor', value: U.num(acc.profitFactor) },
      { label: 'Trades/Day', value: U.num(acc.tradeFrequency, 1) },
    ]);

    const riskMetrics = C.detailGrid([
      { label: 'Edge / Trade', html: C.pnl(edge) },
      { label: 'Edge / Day', html: C.pnl(acc.edgePerDay) },
      { label: 'Kelly Fraction', value: U.pct(kelly * 100) },
      { label: 'Half-Kelly', value: U.pct(kelly * 50) },
      { label: 'Sharpe (annualised)', value: U.num(acc.sharpeRatio) },
      { label: 'Max Drawdown (hist.)', html: `<span class="negative">${U.pct(acc.maxDrawdown * 100)}</span>` },
      { label: 'Current Balance', value: U.money(acc.balance) },
    ]);

    const profileBody = C.grid2(
      `${C.sectionLabel('Trade Distribution')}${tradeDistribution}`,
      `${C.sectionLabel('Risk Metrics')}${riskMetrics}`);
    const profileCard = C.card('Trader Profile', profileBody);

    const content = U.$('#ruin-content');
    content.innerHTML = `${kpis}${chartsRow}${sizingCard}${profileCard}`;

    this._renderMCChart();
    this._renderCapitalChart();
  },

  _currentSizingLabel() {
    const p = S.ruin.params;
    if (p.sizing === 'kelly') return 'Full Kelly';
    if (p.sizing === 'half_kelly') return 'Half Kelly';
    if (p.sizing === 'fixed_fractional') return 'Fixed ' + p.riskPercent + '%';
    return 'Fixed Lot';
  },

  _renderMCChart() {
    const sim = S.ruin.simulation;
    if (!sim) return;
    const ctx = U.$('#ruin-mc-chart');
    if (!ctx) return;

    // Destroy old chart
    if (this._charts.mc) this._charts.mc.destroy();

    const labels = Array.from({ length: sim.days + 1 }, (_, i) => i);
    const pctl = sim.percentiles;

    // Sample individual paths (light grey, thin)
    const pathDatasets = sim.sampleCurves.slice(0, 30).map((curve, i) => ({
      label: i === 0 ? 'Sample Paths' : '',
      data: curve,
      borderColor: 'rgba(148,163,184,0.12)',
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    }));

    this._charts.mc = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          // Percentile bands
          { label: '95th Percentile', data: pctl.p95, borderColor: 'rgba(34,197,94,0.6)', borderWidth: 1.5, pointRadius: 0, fill: false, borderDash: [4, 2] },
          { label: '75th Percentile', data: pctl.p75, borderColor: 'rgba(34,197,94,0.3)', borderWidth: 1, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(34,197,94,0.05)' },
          { label: 'Median', data: pctl.p50, borderColor: '#3b82f6', borderWidth: 2.5, pointRadius: 0, fill: false },
          { label: '25th Percentile', data: pctl.p25, borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(239,68,68,0.05)' },
          { label: '5th Percentile', data: pctl.p5, borderColor: 'rgba(239,68,68,0.6)', borderWidth: 1.5, pointRadius: 0, fill: false, borderDash: [4, 2] },
          // Ruin level
          { label: 'Ruin Level', data: Array(sim.days + 1).fill(sim.ruinLevel), borderColor: 'rgba(239,68,68,0.8)', borderWidth: 2, pointRadius: 0, fill: false, borderDash: [8, 4] },
          // Starting capital reference
          { label: 'Starting Capital', data: Array(sim.days + 1).fill(S.ruin.selectedAccount.balance), borderColor: 'rgba(148,163,184,0.3)', borderWidth: 1, pointRadius: 0, fill: false, borderDash: [2, 2] },
          ...pathDatasets,
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', usePointStyle: true, boxWidth: 12, filter: (item) => item.text !== '' },
          },
          tooltip: {
            callbacks: { label: (ctx) => ctx.dataset.label ? `${ctx.dataset.label}: ${U.money(ctx.parsed.y)}` : '' }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Trading Days', color: '#64748b' }, ticks: { color: '#64748b', maxTicksLimit: 12 }, grid: { color: 'rgba(148,163,184,0.06)' } },
          y: { title: { display: true, text: 'Equity ($)', color: '#64748b' }, ticks: { color: '#64748b', callback: v => '$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(148,163,184,0.06)' } },
        }
      }
    });
  },

  _renderCapitalChart() {
    const porCurve = S.ruin.porCurve;
    if (!porCurve) return;
    const ctx = U.$('#ruin-capital-chart');
    if (!ctx) return;

    if (this._charts.capital) this._charts.capital.destroy();

    const acc = S.ruin.selectedAccount;

    this._charts.capital = new Chart(ctx, {
      type: 'line',
      data: {
        labels: porCurve.capitals.map(c => '$' + (c / 1000).toFixed(0) + 'k'),
        datasets: [
          {
            label: 'Probability of Ruin',
            data: porCurve.porValues.map(v => v * 100),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
          // Vertical line at current capital
          {
            label: 'Current Balance',
            data: porCurve.capitals.map(c => {
              // Create a spike at the closest capital value
              const closest = porCurve.capitals.reduce((prev, curr) => Math.abs(curr - acc.balance) < Math.abs(prev - acc.balance) ? curr : prev);
              return Math.abs(c - closest) < (porCurve.capitals[1] - porCurve.capitals[0]) * 0.6 ? 100 : null;
            }),
            borderColor: '#3b82f6',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            borderDash: [6, 3],
            spanGaps: false,
          },
          // Horizontal threshold lines
          {
            label: 'A-Book Threshold (15%)',
            data: Array(porCurve.capitals.length).fill(CONFIG.RUIN.POR_A_BOOK * 100),
            borderColor: 'rgba(34,197,94,0.5)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            borderDash: [4, 4],
          },
          {
            label: 'B-Book Threshold (60%)',
            data: Array(porCurve.capitals.length).fill(CONFIG.RUIN.POR_B_BOOK * 100),
            borderColor: 'rgba(168,85,247,0.5)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            borderDash: [4, 4],
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', usePointStyle: true, boxWidth: 12 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` } }
        },
        scales: {
          x: { title: { display: true, text: 'Starting Capital', color: '#64748b' }, ticks: { color: '#64748b', maxTicksLimit: 10 }, grid: { color: 'rgba(148,163,184,0.06)' } },
          y: { title: { display: true, text: 'Probability of Ruin (%)', color: '#64748b' }, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,0.06)' }, min: 0, max: 100 },
        }
      }
    });
  },
};

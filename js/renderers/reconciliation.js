/**
 * Reconciliation — three-way match: MT5 vs LP vs EMI
 */
const ReconciliationRenderer = {
  render() {
    Header.setTitle('Daily Reconciliation');
    const view = U.$('#view-reconciliation');
    const runs = S.reconciliation.runs;
    const items = S.reconciliation.items;
    const breaks = S.reconciliation.breaks;

    const latestRun = runs[0];
    const totalMatched = items.filter(i => i.status === 'matched').length;
    const totalBreaks = items.filter(i => i.status === 'break').length;

    const actions = C.pageActions([
      { label: 'Run Reconciliation Now', onclick: "ReconciliationRenderer.runNow()", variant: 'primary' },
    ]);

    const kpis = C.kpiGrid([
      C.kpi('Last Run', latestRun ? U.date(latestRun.date) : 'Never', latestRun ? latestRun.runDuration : ''),
      C.kpi('Status', totalBreaks > 0 ? totalBreaks + ' Breaks' : 'All Matched', undefined,
        { variant: totalBreaks > 0 ? 'danger' : 'success' }),
      C.kpi('Items Checked', items.length, totalMatched + ' matched'),
      C.kpi('Force Matched', items.filter(i => i.status === 'force_matched').length),
    ], 4);

    // Three-Way Match table
    const matchRows = items.map(item => `
      <tr class="${item.status === 'break' ? 'row-danger' : ''}">
        <td><strong>${U.escape(item.type)}</strong></td>
        <td class="text-right">${item.mt5Value != null ? U.num(item.mt5Value) : '-'}</td>
        <td class="text-right">${item.lpValue != null ? U.num(item.lpValue) : '-'}</td>
        <td class="text-right">${item.emiValue != null ? U.num(item.emiValue) : '-'}</td>
        <td class="text-right ${item.variance !== 0 ? 'text-danger' : ''}">${item.variance !== 0 ? U.num(item.variance) : '0'}</td>
        <td>${C.badge(item.status)}</td>
        <td class="text-sm">${item.reason || '-'}</td>
        <td>
          ${item.status === 'break' ? `
            ${C.actionBtn('Force Match', "ReconciliationRenderer.forceMatch('" + item.id + "')", 'warning')}
            ${C.actionBtn('Investigate', "ReconciliationRenderer.investigate('" + item.id + "')")}
          ` : ''}
        </td>
      </tr>
    `);

    const matchTable = C.simpleTable(
      ['Item', 'MT5 (Source A)', 'LP (Source B)', 'EMI (Source C)', 'Variance', 'Status', 'Reason', 'Actions'],
      matchRows
    );

    const matchCard = C.card('Three-Way Match \u2014 ' + (latestRun ? U.date(latestRun.date) : 'Latest'), matchTable);

    // Run History table
    const historyRows = runs.map(r => `<tr>
      <td>${U.date(r.date)}</td>
      <td>${r.totalItems}</td>
      <td>${r.matched}</td>
      <td class="${r.breaks > 0 ? 'text-danger' : ''}">${r.breaks}</td>
      <td>${r.forcedMatch}</td>
      <td>${r.runDuration}</td>
      <td>${U.escape(r.triggeredBy)}</td>
      <td>${C.badge(r.status)}</td>
    </tr>`);

    const historyTable = C.simpleTable(
      ['Date', 'Items', 'Matched', 'Breaks', 'Force Matched', 'Duration', 'Triggered By', 'Status'],
      historyRows,
      { compact: true }
    );

    const historyCard = C.card('Run History (14 days)', historyTable);

    view.innerHTML = `
      ${actions}
      ${kpis}
      ${matchCard}
      ${historyCard}
    `;
  },

  runNow() {
    Toast.info('Running reconciliation...');
    setTimeout(() => {
      API.runReconciliation();
      Toast.success('Reconciliation complete');
      this.render();
    }, 1500);
  },

  forceMatch(id) {
    Modal.confirm('Force Match', 'Force-match this item? This will be recorded in the audit trail.', () => {
      const item = S.reconciliation.items.find(i => i.id === id);
      if (item) { item.status = 'force_matched'; item.reason = 'Force matched by Admin'; }
      S.reconciliation.breaks = S.reconciliation.items.filter(i => i.status === 'break');
      Toast.warning('Item force-matched');
      this.render();
    });
  },

  investigate(id) {
    Modal.form('Investigate Break', [
      { name: 'notes', label: 'Investigation Notes', type: 'textarea' },
      { name: 'assignee', label: 'Assign To', type: 'select', options: ['Finance','Operations','Risk','Compliance'].map(v => ({ value: v, label: v })) },
    ], (data) => {
      Toast.info('Break assigned to ' + data.assignee);
    });
  },
};

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

    view.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="ReconciliationRenderer.runNow()">Run Reconciliation Now</button>
      </div>

      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Last Run</div><div class="kpi-value">${latestRun ? U.date(latestRun.date) : 'Never'}</div><div class="kpi-sub">${latestRun ? latestRun.runDuration : ''}</div></div>
        <div class="kpi-card ${totalBreaks > 0 ? 'kpi-danger' : 'kpi-success'}"><div class="kpi-label">Status</div><div class="kpi-value">${totalBreaks > 0 ? totalBreaks + ' Breaks' : 'All Matched'}</div></div>
        <div class="kpi-card"><div class="kpi-label">Items Checked</div><div class="kpi-value">${items.length}</div><div class="kpi-sub">${totalMatched} matched</div></div>
        <div class="kpi-card"><div class="kpi-label">Force Matched</div><div class="kpi-value">${items.filter(i => i.status === 'force_matched').length}</div></div>
      </div>

      <!-- Reconciliation Grid -->
      <div class="card">
        <div class="card-header"><h3>Three-Way Match — ${latestRun ? U.date(latestRun.date) : 'Latest'}</h3></div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">MT5 (Source A)</th>
                <th class="text-right">LP (Source B)</th>
                <th class="text-right">EMI (Source C)</th>
                <th class="text-right">Variance</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr class="${item.status === 'break' ? 'row-danger' : ''}">
                  <td><strong>${item.type}</strong></td>
                  <td class="text-right">${item.mt5Value != null ? U.num(item.mt5Value) : '-'}</td>
                  <td class="text-right">${item.lpValue != null ? U.num(item.lpValue) : '-'}</td>
                  <td class="text-right">${item.emiValue != null ? U.num(item.emiValue) : '-'}</td>
                  <td class="text-right ${item.variance !== 0 ? 'text-danger' : ''}">${item.variance !== 0 ? U.num(item.variance) : '0'}</td>
                  <td><span class="badge ${U.statusClass(item.status)}">${item.status}</span></td>
                  <td class="text-sm">${item.reason || '-'}</td>
                  <td>
                    ${item.status === 'break' ? `
                      <button class="btn btn-xs btn-warning" onclick="ReconciliationRenderer.forceMatch('${item.id}')">Force Match</button>
                      <button class="btn btn-xs btn-secondary" onclick="ReconciliationRenderer.investigate('${item.id}')">Investigate</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Run History -->
      <div class="card">
        <div class="card-header"><h3>Run History (14 days)</h3></div>
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Date</th><th>Items</th><th>Matched</th><th>Breaks</th><th>Force Matched</th><th>Duration</th><th>Triggered By</th><th>Status</th></tr></thead>
            <tbody>
              ${runs.map(r => `<tr>
                <td>${U.date(r.date)}</td>
                <td>${r.totalItems}</td>
                <td>${r.matched}</td>
                <td class="${r.breaks > 0 ? 'text-danger' : ''}">${r.breaks}</td>
                <td>${r.forcedMatch}</td>
                <td>${r.runDuration}</td>
                <td>${r.triggeredBy}</td>
                <td><span class="badge ${U.statusClass(r.status)}">${r.status}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
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

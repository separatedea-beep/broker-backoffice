/**
 * Deposits & Withdrawals — approval queue + history
 */
const DepositsRenderer = {
  render() {
    Header.setTitle('Deposits & Withdrawals');
    const view = U.$('#view-deposits');
    const tab = S.deposits.activeTab;
    const f = S.deposits.filters;

    const pending = S.deposits.pending;
    const depCount = pending.filter(t => t.type === 'deposit').length;
    const wdCount = pending.filter(t => t.type === 'withdrawal').length;

    let list = S.deposits.history;
    if (tab === 'deposits') list = list.filter(t => t.type === 'deposit');
    else if (tab === 'withdrawals') list = list.filter(t => t.type === 'withdrawal');
    if (f.status !== 'all') list = list.filter(t => t.status === f.status);

    view.innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card kpi-warning"><div class="kpi-label">Pending Deposits</div><div class="kpi-value">${depCount}</div></div>
        <div class="kpi-card kpi-warning"><div class="kpi-label">Pending Withdrawals</div><div class="kpi-value">${wdCount}</div></div>
        <div class="kpi-card"><div class="kpi-label">Today's Deposits</div><div class="kpi-value">${U.money(list.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s,t) => s + t.amount, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Today's Withdrawals</div><div class="kpi-value">${U.money(list.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s,t) => s + t.amount, 0))}</div></div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab ${tab === 'all' ? 'tab-active' : ''}" onclick="S.deposits.activeTab='all'; DepositsRenderer.render()">All</button>
        <button class="tab ${tab === 'deposits' ? 'tab-active' : ''}" onclick="S.deposits.activeTab='deposits'; DepositsRenderer.render()">Deposits (${depCount})</button>
        <button class="tab ${tab === 'withdrawals' ? 'tab-active' : ''}" onclick="S.deposits.activeTab='withdrawals'; DepositsRenderer.render()">Withdrawals (${wdCount})</button>
      </div>

      <div class="card">
        <div id="deposits-table"></div>
      </div>
    `;

    Table.render('deposits-table', {
      filters: `
        <select class="form-control form-sm" onchange="S.deposits.filters.status=this.value; DepositsRenderer.render()">
          <option value="all" ${f.status==='all'?'selected':''}>All Status</option>
          <option value="pending" ${f.status==='pending'?'selected':''}>Pending</option>
          <option value="approved" ${f.status==='approved'?'selected':''}>Approved</option>
          <option value="rejected" ${f.status==='rejected'?'selected':''}>Rejected</option>
          <option value="under_investigation" ${f.status==='under_investigation'?'selected':''}>Investigating</option>
          <option value="completed" ${f.status==='completed'?'selected':''}>Completed</option>
        </select>
      `,
      columns: [
        { key: 'id', label: 'ID', width: '80px' },
        { key: 'accountId', label: 'Account' },
        { key: 'accountName', label: 'Client' },
        { key: 'type', label: 'Type', render: (v) => `<span class="badge ${v === 'deposit' ? 'badge-success' : 'badge-warning'}">${v}</span>` },
        { key: 'amount', label: 'Amount', align: 'right', render: (v, r) => U.money(v, r.currency) },
        { key: 'method', label: 'Method' },
        { key: 'gateway', label: 'Gateway' },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge ${U.statusClass(v)}">${v}</span>` },
        { key: 'riskFlags', label: 'Flags', render: (v) => v && v.length ? v.map(f => `<span class="badge badge-danger">${f}</span>`).join(' ') : '-' },
        { key: 'createdAt', label: 'Date', render: (v) => U.datetime(v) },
      ],
      data: list,
      page: S.deposits.page,
      actions: (row) => {
        if (row.status === 'pending') {
          return `
            <button class="btn btn-xs btn-success" onclick="DepositsRenderer.approve('${row.id}')">Approve</button>
            <button class="btn btn-xs btn-danger" onclick="DepositsRenderer.reject('${row.id}')">Reject</button>
            <button class="btn btn-xs btn-warning" onclick="DepositsRenderer.investigate('${row.id}')">Invest.</button>
          `;
        }
        if (row.status === 'under_investigation') {
          return `
            <button class="btn btn-xs btn-success" onclick="DepositsRenderer.approve('${row.id}')">Approve</button>
            <button class="btn btn-xs btn-danger" onclick="DepositsRenderer.reject('${row.id}')">Reject</button>
          `;
        }
        return `<span class="text-muted text-sm">${row.reviewedBy || '-'}</span>`;
      },
      exportable: true,
    });
  },

  approve(id) {
    Modal.confirm('Approve Transaction', 'Approve this transaction?', () => {
      API.approveTransaction(id);
      Toast.success('Transaction approved');
      this.render();
    });
  },

  reject(id) {
    Modal.form('Reject Transaction', [
      { name: 'reason', label: 'Rejection Reason', type: 'textarea' },
    ], (data) => {
      API.rejectTransaction(id, data.reason);
      Toast.warning('Transaction rejected');
      this.render();
    });
  },

  investigate(id) {
    API.investigateTransaction(id);
    Toast.info('Transaction marked for investigation');
    this.render();
  },
};

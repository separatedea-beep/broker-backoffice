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

    const kpis = C.kpiGrid([
      C.kpi('Pending Deposits', depCount, undefined, { variant: 'warning' }),
      C.kpi('Pending Withdrawals', wdCount, undefined, { variant: 'warning' }),
      C.kpi("Today's Deposits", U.money(list.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0))),
      C.kpi("Today's Withdrawals", U.money(list.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0))),
    ], 4);

    const tabs = C.tabs([
      { id: 'all', label: 'All' },
      { id: 'deposits', label: 'Deposits', count: depCount },
      { id: 'withdrawals', label: 'Withdrawals', count: wdCount },
    ], tab, "S.deposits.activeTab='{id}'; DepositsRenderer.render()");

    view.innerHTML = `
      ${kpis}
      ${tabs}
      ${C.card('', '<div id="deposits-table"></div>')}
    `;

    const filters = C.filterBar([
      { type: 'select', label: 'Status', value: f.status, onChange: "S.deposits.filters.status=this.value; DepositsRenderer.render()", options: [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'under_investigation', label: 'Investigating' },
        { value: 'completed', label: 'Completed' },
      ]},
    ]);

    Table.render('deposits-table', {
      filters,
      columns: [
        Columns.text('id', 'ID', { width: '80px' }),
        Columns.text('accountId', 'Account'),
        Columns.text('accountName', 'Client'),
        { key: 'type', label: 'Type', render: (v) => C.badge(v, v === 'deposit' ? 'success' : 'warning') },
        { key: 'amount', label: 'Amount', align: 'right', render: (v, r) => U.money(v, r.currency) },
        Columns.text('method', 'Method'),
        Columns.text('gateway', 'Gateway'),
        Columns.badge('status', 'Status'),
        Columns.riskFlags('riskFlags'),
        Columns.datetime('createdAt', 'Date'),
      ],
      data: list,
      page: S.deposits.page,
      actions: (row) => {
        if (row.status === 'pending') {
          return `
            ${C.actionBtn('Approve', "DepositsRenderer.approve('" + row.id + "')", 'success')}
            ${C.actionBtn('Reject', "DepositsRenderer.reject('" + row.id + "')", 'danger')}
            ${C.actionBtn('Invest.', "DepositsRenderer.investigate('" + row.id + "')", 'warning')}
          `;
        }
        if (row.status === 'under_investigation') {
          return `
            ${C.actionBtn('Approve', "DepositsRenderer.approve('" + row.id + "')", 'success')}
            ${C.actionBtn('Reject', "DepositsRenderer.reject('" + row.id + "')", 'danger')}
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

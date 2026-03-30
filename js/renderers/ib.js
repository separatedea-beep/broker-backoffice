/**
 * IB (Introducing Broker) Management
 */
const IBRenderer = {
  render() {
    Header.setTitle('IB Management');
    const view = U.$('#view-ib');

    const actions = C.pageActions([
      { label: '+ New IB', onclick: "IBRenderer.openNew()", variant: 'primary' },
    ]);

    const kpis = C.kpiGrid([
      C.kpi('Total IBs', S.ib.list.length),
      C.kpi('Active IBs', S.ib.list.filter(i => i.status === 'active').length),
      C.kpi('Total Referred Clients', S.ib.list.reduce((s, i) => s + i.totalClients, 0)),
      C.kpi('Unpaid Commissions', U.money(S.ib.list.reduce((s, i) => s + i.unpaidCommissions, 0))),
    ], 4);

    view.innerHTML = `
      ${actions}
      ${kpis}
      ${C.card('', '<div id="ib-table"></div>')}
    `;

    Table.render('ib-table', {
      columns: [
        Columns.text('id', 'ID', { width: '60px' }),
        Columns.name('name', 'Name'),
        Columns.badge('status', 'Status'),
        { key: 'commissionType', label: 'Commission Type', render: (v) => U.statusLabel(v) },
        { key: 'commissionRate', label: 'Rate', render: (v, r) => r.commissionType === 'cpa' ? U.money(v) : U.num(v) + (r.commissionType === 'lot_rebate' ? ' $/lot' : '%') },
        { key: 'totalClients', label: 'Clients', align: 'center' },
        { key: 'activeClients', label: 'Active', align: 'center' },
        Columns.money('totalVolume', 'Volume'),
        Columns.money('totalCommissions', 'Total Comm.'),
        { key: 'unpaidCommissions', label: 'Unpaid', align: 'right', render: (v) => `<span class="${v > 5000 ? 'text-warning' : ''}">${U.money(v)}</span>` },
        { key: 'parentIbId', label: 'Parent IB', render: (v) => v || '-' },
      ],
      data: S.ib.list,
      page: S.ib.page,
      onRowClick: 'IBRenderer.showDetail',
      actions: (row) => C.actionBtn('Edit', "event.stopPropagation(); IBRenderer.editIB('" + row.id + "')"),
      exportable: true,
    });
  },

  showDetail(id) {
    S.ib.selected = S.ib.list.find(i => i.id === id);
    BO.navigate('ib-detail');
  },

  renderDetail() {
    const ib = S.ib.selected;
    if (!ib) return BO.navigate('ib');
    Header.setTitle(ib.name, `<a class="breadcrumb-link" onclick="BO.navigate('ib')">IBs</a> / ${ib.name}`);

    const clients = S.accounts.list.filter(a => a.ibId === ib.id);
    const subIBs = S.ib.list.filter(i => i.parentIbId === ib.id);

    const actions = C.pageActions([
      { label: '\u2190 Back', onclick: "BO.navigate('ib')", variant: 'secondary' },
      { label: 'Edit IB', onclick: `IBRenderer.editIB('${ib.id}')`, variant: 'primary' },
    ]);

    const kpis = C.kpiGrid([
      C.kpi('Total Clients', ib.totalClients),
      C.kpi('Active Clients', ib.activeClients),
      C.kpi('Total Volume', U.money(ib.totalVolume)),
      C.kpi('Unpaid', U.money(ib.unpaidCommissions)),
    ], 4);

    const detailCard = C.card('IB Details', C.detailGrid([
      { label: 'ID', value: ib.id },
      { label: 'Email', value: ib.contactEmail },
      { label: 'Status', html: C.badge(ib.status) },
      { label: 'Commission Type', value: U.statusLabel(ib.commissionType) },
      { label: 'Rate', value: U.num(ib.commissionRate) },
      { label: 'Payout Method', value: ib.payoutMethod },
      { label: 'Parent IB', value: ib.parentIbId || 'None (top-level)' },
      { label: 'Created', value: U.date(ib.createdAt) },
    ]));

    const subIBBody = subIBs.length === 0
      ? C.emptyState('No sub-IBs')
      : C.simpleTable(
          ['ID', 'Name', 'Clients', 'Volume'],
          subIBs.map(s => `<tr class="clickable" onclick="IBRenderer.showDetail('${s.id}')"><td>${U.escape(s.id)}</td><td>${U.escape(s.name)}</td><td>${s.totalClients}</td><td>${U.money(s.totalVolume)}</td></tr>`),
          { compact: true }
        );
    const subIBCard = C.card(`Sub-IBs (${subIBs.length})`, subIBBody);

    const clientsBody = clients.length === 0
      ? C.emptyState('No clients')
      : C.simpleTable(
          ['Login', 'Name', 'Status', 'Balance', 'Equity'],
          clients.map(c => `<tr class="clickable" onclick="AccountsRenderer.showDetail('${c.id}')"><td>${U.escape(String(c.login))}</td><td>${U.escape(c.name)}</td><td>${C.badge(c.status)}</td><td>${U.money(c.balance)}</td><td>${U.money(c.equity)}</td></tr>`),
          { compact: true }
        );
    const clientsCard = C.card(`Referred Clients (${clients.length})`, clientsBody);

    U.$('#view-ib-detail').innerHTML = `
      ${actions}
      ${kpis}
      ${C.grid2(detailCard, subIBCard)}
      ${clientsCard}
    `;
  },

  openNew() {
    Modal.form('Create New IB', [
      { name: 'name', label: 'IB Name' },
      { name: 'email', label: 'Contact Email', type: 'email' },
      { name: 'commissionType', label: 'Commission Type', type: 'select', options: ['spread_share','lot_rebate','revenue_share','cpa','hybrid'].map(v => ({ value: v, label: v.replace(/_/g, ' ') })) },
      { name: 'commissionRate', label: 'Rate', type: 'number' },
      { name: 'payoutMethod', label: 'Payout Method', type: 'select', options: ['Bank Wire','Skrill','Account Credit'].map(v => ({ value: v, label: v })) },
    ], (data) => {
      S.ib.list.push({ id: 'IB' + (S.ib.list.length + 1), ...data, commissionRate: parseFloat(data.commissionRate), currency: 'USD', totalClients: 0, activeClients: 0, totalVolume: 0, totalCommissions: 0, unpaidCommissions: 0, status: 'active', parentIbId: null, contactEmail: data.email, createdAt: new Date() });
      Toast.success('IB created');
      this.render();
    });
  },

  editIB(id) {
    const ib = S.ib.list.find(i => i.id === id);
    if (!ib) return;
    Modal.form('Edit IB \u2014 ' + ib.name, [
      { name: 'commissionType', label: 'Commission Type', type: 'select', options: ['spread_share','lot_rebate','revenue_share','cpa','hybrid'].map(v => ({ value: v, label: v.replace(/_/g, ' ') })), value: ib.commissionType },
      { name: 'commissionRate', label: 'Rate', type: 'number', value: ib.commissionRate },
      { name: 'payoutMethod', label: 'Payout Method', type: 'select', options: ['Bank Wire','Skrill','Account Credit'].map(v => ({ value: v, label: v })), value: ib.payoutMethod },
      { name: 'status', label: 'Status', type: 'select', options: ['active','suspended'].map(v => ({ value: v, label: v })), value: ib.status },
    ], (data) => {
      Object.assign(ib, { commissionType: data.commissionType, commissionRate: parseFloat(data.commissionRate), payoutMethod: data.payoutMethod, status: data.status });
      Toast.success('IB updated');
      BO.renderCurrentView();
    });
  },
};

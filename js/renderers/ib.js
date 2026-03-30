/**
 * IB (Introducing Broker) Management
 */
const IBRenderer = {
  render() {
    Header.setTitle('IB Management');
    const view = U.$('#view-ib');

    view.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="IBRenderer.openNew()">+ New IB</button>
      </div>

      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Total IBs</div><div class="kpi-value">${S.ib.list.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Active IBs</div><div class="kpi-value">${S.ib.list.filter(i=>i.status==='active').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Referred Clients</div><div class="kpi-value">${S.ib.list.reduce((s,i)=>s+i.totalClients,0)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Unpaid Commissions</div><div class="kpi-value">${U.money(S.ib.list.reduce((s,i)=>s+i.unpaidCommissions,0))}</div></div>
      </div>

      <div class="card">
        <div id="ib-table"></div>
      </div>
    `;

    Table.render('ib-table', {
      columns: [
        { key: 'id', label: 'ID', width: '60px' },
        { key: 'name', label: 'Name', render: (v) => `<span class="text-primary">${v}</span>` },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge ${U.statusClass(v)}">${v}</span>` },
        { key: 'commissionType', label: 'Commission Type', render: (v) => v.replace(/_/g, ' ') },
        { key: 'commissionRate', label: 'Rate', render: (v, r) => r.commissionType === 'cpa' ? U.money(v) : U.num(v) + (r.commissionType === 'lot_rebate' ? ' $/lot' : '%') },
        { key: 'totalClients', label: 'Clients', align: 'center' },
        { key: 'activeClients', label: 'Active', align: 'center' },
        { key: 'totalVolume', label: 'Volume', align: 'right', render: (v) => U.money(v) },
        { key: 'totalCommissions', label: 'Total Comm.', align: 'right', render: (v) => U.money(v) },
        { key: 'unpaidCommissions', label: 'Unpaid', align: 'right', render: (v) => `<span class="${v > 5000 ? 'text-warning' : ''}">${U.money(v)}</span>` },
        { key: 'parentIbId', label: 'Parent IB', render: (v) => v || '-' },
      ],
      data: S.ib.list,
      page: S.ib.page,
      onRowClick: 'IBRenderer.showDetail',
      actions: (row) => `
        <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); IBRenderer.editIB('${row.id}')">Edit</button>
      `,
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

    U.$('#view-ib-detail').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="BO.navigate('ib')">&#8592; Back</button>
        <button class="btn btn-primary" onclick="IBRenderer.editIB('${ib.id}')">Edit IB</button>
      </div>

      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Total Clients</div><div class="kpi-value">${ib.totalClients}</div></div>
        <div class="kpi-card"><div class="kpi-label">Active Clients</div><div class="kpi-value">${ib.activeClients}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Volume</div><div class="kpi-value">${U.money(ib.totalVolume)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Unpaid</div><div class="kpi-value">${U.money(ib.unpaidCommissions)}</div></div>
      </div>

      <div class="grid-2col">
        <div class="card">
          <div class="card-header"><h3>IB Details</h3></div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-row"><span class="detail-label">ID</span><span>${ib.id}</span></div>
              <div class="detail-row"><span class="detail-label">Email</span><span>${ib.contactEmail}</span></div>
              <div class="detail-row"><span class="detail-label">Status</span><span class="badge ${U.statusClass(ib.status)}">${ib.status}</span></div>
              <div class="detail-row"><span class="detail-label">Commission Type</span><span>${ib.commissionType.replace(/_/g, ' ')}</span></div>
              <div class="detail-row"><span class="detail-label">Rate</span><span>${U.num(ib.commissionRate)}</span></div>
              <div class="detail-row"><span class="detail-label">Payout Method</span><span>${ib.payoutMethod}</span></div>
              <div class="detail-row"><span class="detail-label">Parent IB</span><span>${ib.parentIbId || 'None (top-level)'}</span></div>
              <div class="detail-row"><span class="detail-label">Created</span><span>${U.date(ib.createdAt)}</span></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Sub-IBs (${subIBs.length})</h3></div>
          <div class="card-body">
            ${subIBs.length === 0 ? '<p class="text-muted">No sub-IBs</p>' : `
              <table class="data-table compact">
                <thead><tr><th>ID</th><th>Name</th><th>Clients</th><th>Volume</th></tr></thead>
                <tbody>${subIBs.map(s => `<tr class="clickable" onclick="IBRenderer.showDetail('${s.id}')"><td>${s.id}</td><td>${s.name}</td><td>${s.totalClients}</td><td>${U.money(s.totalVolume)}</td></tr>`).join('')}</tbody>
              </table>
            `}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Referred Clients (${clients.length})</h3></div>
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Login</th><th>Name</th><th>Status</th><th>Balance</th><th>Equity</th></tr></thead>
            <tbody>
              ${clients.map(c => `<tr class="clickable" onclick="AccountsRenderer.showDetail('${c.id}')"><td>${c.login}</td><td>${c.name}</td><td><span class="badge ${U.statusClass(c.status)}">${c.status}</span></td><td>${U.money(c.balance)}</td><td>${U.money(c.equity)}</td></tr>`).join('')}
              ${clients.length === 0 ? '<tr><td colspan="5" class="empty-row">No clients</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
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
    Modal.form('Edit IB — ' + ib.name, [
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

/**
 * Finance Operations — EMI accounts, LP margin calls, gateway recon, IB payouts
 */
const FinanceRenderer = {
  renderEMI() {
    Header.setTitle('EMI Accounts');
    const emis = S.finance.emiAccounts;
    const transfers = S.finance.emiTransfers;

    U.$('#view-emi').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="FinanceRenderer.newTransfer()">+ New Transfer</button>
      </div>

      <!-- EMI Account Cards -->
      <div class="emi-grid">
        ${emis.map(e => `
          <div class="emi-card">
            <div class="emi-header">
              <strong>${e.name}</strong>
              <span class="badge badge-info">${e.currency}</span>
            </div>
            <div class="emi-body">
              <div class="emi-row"><span>Provider</span><span>${e.provider}</span></div>
              <div class="emi-row"><span>Total Balance</span><span class="text-primary"><strong>${U.money(e.balance, e.currency)}</strong></span></div>
              <div class="emi-row"><span>Segregated (Client)</span><span>${U.money(e.segregated, e.currency)}</span></div>
              <div class="emi-row"><span>Operational</span><span>${U.money(e.operational, e.currency)}</span></div>
              <div class="emi-row"><span>Last Reconciled</span><span>${U.date(e.lastReconciled)}</span></div>
            </div>
            <div class="emi-footer">
              <div class="seg-check ${e.segregated <= e.balance ? 'seg-ok' : 'seg-fail'}">
                ${e.segregated <= e.balance ? 'Segregation OK' : 'SEGREGATION SHORTFALL'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Transfers -->
      <div class="card">
        <div class="card-header"><h3>Inter-EMI Transfers</h3></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>ID</th><th>From</th><th>To</th><th>Amount</th><th>Currency</th><th>Status</th><th>Requested</th><th>Requested By</th><th>Approved By</th><th>Actions</th></tr></thead>
            <tbody>
              ${transfers.map(t => `<tr>
                <td>${t.id}</td>
                <td>${t.fromName}</td>
                <td>${t.toName}</td>
                <td class="text-right">${U.money(t.amount, t.currency)}</td>
                <td>${t.currency}</td>
                <td><span class="badge ${U.statusClass(t.status)}">${t.status}</span></td>
                <td>${U.datetime(t.requestedAt)}</td>
                <td>${t.requestedBy}</td>
                <td>${t.approvedBy || '-'}</td>
                <td>${t.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="FinanceRenderer.approveTransfer('${t.id}')">Approve</button>` : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  newTransfer() {
    const emis = S.finance.emiAccounts;
    Modal.form('New Inter-EMI Transfer', [
      { name: 'from', label: 'From EMI', type: 'select', options: emis.map(e => ({ value: e.id, label: e.name })) },
      { name: 'to', label: 'To EMI', type: 'select', options: emis.map(e => ({ value: e.id, label: e.name })) },
      { name: 'amount', label: 'Amount', type: 'number', placeholder: '50000' },
      { name: 'currency', label: 'Currency', type: 'select', options: ['USD','EUR','GBP'].map(c => ({ value: c, label: c })) },
    ], (data) => {
      const from = emis.find(e => e.id === data.from);
      const to = emis.find(e => e.id === data.to);
      S.finance.emiTransfers.push({ id: 'ET' + U.uid(), from: data.from, to: data.to, fromName: from?.name || data.from, toName: to?.name || data.to, amount: parseFloat(data.amount), currency: data.currency, status: 'pending', requestedBy: 'Admin', approvedBy: null, requestedAt: new Date(), completedAt: null });
      Toast.success('Transfer request created');
      this.renderEMI();
    });
  },

  approveTransfer(id) {
    const t = S.finance.emiTransfers.find(x => x.id === id);
    if (t) { t.status = 'completed'; t.approvedBy = 'Admin'; t.completedAt = new Date(); }
    Toast.success('Transfer approved');
    this.renderEMI();
  },

  // LP Margin Calls
  renderMarginCalls() {
    Header.setTitle('LP Margin Calls');
    const calls = S.finance.lpMarginCalls;

    U.$('#view-lp-margin-calls').innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card ${calls.filter(c => c.status === 'overdue').length > 0 ? 'kpi-danger' : ''}"><div class="kpi-label">Overdue</div><div class="kpi-value">${calls.filter(c => c.status === 'overdue').length}</div></div>
        <div class="kpi-card kpi-warning"><div class="kpi-label">Pending</div><div class="kpi-value">${calls.filter(c => c.status === 'pending').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Outstanding</div><div class="kpi-value">${U.money(calls.filter(c => c.status !== 'funded').reduce((s,c) => s + c.amount, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Funded</div><div class="kpi-value">${calls.filter(c => c.status === 'funded').length}</div></div>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>ID</th><th>LP</th><th>Amount</th><th>Currency</th><th>Due Date</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>
              ${calls.map(c => `<tr class="${c.status === 'overdue' ? 'row-danger' : ''}">
                <td>${c.id}</td>
                <td><strong>${c.lpName}</strong></td>
                <td class="text-right">${U.money(c.amount, c.currency)}</td>
                <td>${c.currency}</td>
                <td class="${c.status === 'overdue' ? 'text-danger' : ''}">${U.date(c.dueDate)}</td>
                <td><span class="badge ${U.statusClass(c.status)}">${c.status}</span></td>
                <td>${U.datetime(c.requestedAt)}</td>
                <td>
                  ${c.status === 'pending' || c.status === 'overdue' ? `<button class="btn btn-xs btn-success" onclick="FinanceRenderer.fundMarginCall('${c.id}')">Fund</button>` : '-'}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  fundMarginCall(id) {
    const c = S.finance.lpMarginCalls.find(x => x.id === id);
    if (c) c.status = 'funded';
    Toast.success('Margin call funded');
    this.renderMarginCalls();
  },

  // Gateway Settlements
  renderGatewayRecon() {
    Header.setTitle('Gateway Settlements');
    const settlements = S.finance.gatewaySettlements;

    U.$('#view-gateway-recon').innerHTML = `
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Gateway</th><th>Period</th><th class="text-right">Deposits</th><th class="text-right">Withdrawals</th><th class="text-right">Fees</th><th class="text-right">Net Settlement</th><th class="text-right">Expected</th><th class="text-right">Actual</th><th class="text-right">Variance</th><th>Status</th><th>Settled</th></tr></thead>
            <tbody>
              ${settlements.map(g => `<tr class="${g.status === 'discrepancy' ? 'row-warning' : ''}">
                <td><strong>${g.gateway}</strong></td>
                <td>${g.period}</td>
                <td class="text-right">${U.money(g.totalDeposits)}</td>
                <td class="text-right">${U.money(g.totalWithdrawals)}</td>
                <td class="text-right negative">${U.money(g.fees)}</td>
                <td class="text-right">${U.money(g.netSettlement)}</td>
                <td class="text-right">${U.money(g.expectedAmount)}</td>
                <td class="text-right">${U.money(g.actualAmount)}</td>
                <td class="text-right ${g.variance !== 0 ? 'text-danger' : ''}">${U.money(g.variance)}</td>
                <td><span class="badge ${U.statusClass(g.status === 'reconciled' ? 'matched' : g.status === 'discrepancy' ? 'break' : 'pending')}">${g.status}</span></td>
                <td>${g.settledAt ? U.date(g.settledAt) : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // IB Payouts
  renderIBPayouts() {
    Header.setTitle('IB Payouts');
    const payouts = S.finance.ibPayouts;

    U.$('#view-ib-payouts').innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Total Pending</div><div class="kpi-value">${U.money(payouts.filter(p => p.status === 'pending' || p.status === 'approved').reduce((s,p) => s + p.netAmount, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Pending Count</div><div class="kpi-value">${payouts.filter(p => p.status === 'pending').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Approved</div><div class="kpi-value">${payouts.filter(p => p.status === 'approved').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Paid</div><div class="kpi-value">${payouts.filter(p => p.status === 'paid').length}</div></div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="FinanceRenderer.bulkApprovePayout()">Bulk Approve All Pending</button>
        <button class="btn btn-success" onclick="FinanceRenderer.bulkPayApproved()">Pay All Approved</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>IB</th><th>Period</th><th class="text-right">Gross</th><th class="text-right">Adjustments</th><th class="text-right">Net</th><th>Method</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr></thead>
            <tbody>
              ${payouts.map(p => `<tr>
                <td><strong>${p.ibName}</strong></td>
                <td>${p.period}</td>
                <td class="text-right">${U.money(p.grossAmount)}</td>
                <td class="text-right negative">${U.money(p.adjustments)}</td>
                <td class="text-right"><strong>${U.money(p.netAmount)}</strong></td>
                <td>${p.method}</td>
                <td><span class="badge ${U.statusClass(p.status)}">${p.status}</span></td>
                <td>${U.date(p.scheduledDate)}</td>
                <td>
                  ${p.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="FinanceRenderer.approvePayout('${p.ibId}')">Approve</button><button class="btn btn-xs btn-warning" onclick="FinanceRenderer.holdPayout('${p.ibId}')">Hold</button>` : ''}
                  ${p.status === 'approved' ? `<button class="btn btn-xs btn-primary" onclick="FinanceRenderer.payPayout('${p.ibId}')">Mark Paid</button>` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  approvePayout(ibId) {
    const p = S.finance.ibPayouts.find(x => x.ibId === ibId);
    if (p) p.status = 'approved';
    Toast.success('Payout approved');
    this.renderIBPayouts();
  },

  holdPayout(ibId) {
    const p = S.finance.ibPayouts.find(x => x.ibId === ibId);
    if (p) p.status = 'on_hold';
    Toast.warning('Payout on hold');
    this.renderIBPayouts();
  },

  payPayout(ibId) {
    const p = S.finance.ibPayouts.find(x => x.ibId === ibId);
    if (p) p.status = 'paid';
    Toast.success('Payout marked as paid');
    this.renderIBPayouts();
  },

  bulkApprovePayout() {
    S.finance.ibPayouts.filter(p => p.status === 'pending').forEach(p => p.status = 'approved');
    Toast.success('All pending payouts approved');
    this.renderIBPayouts();
  },

  bulkPayApproved() {
    S.finance.ibPayouts.filter(p => p.status === 'approved').forEach(p => p.status = 'paid');
    Toast.success('All approved payouts marked as paid');
    this.renderIBPayouts();
  },
};

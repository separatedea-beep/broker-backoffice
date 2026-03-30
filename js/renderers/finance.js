/**
 * Finance Operations — EMI accounts, LP margin calls, gateway recon, IB payouts
 */
const FinanceRenderer = {
  renderEMI() {
    Header.setTitle('EMI Accounts');
    const emis = S.finance.emiAccounts;
    const transfers = S.finance.emiTransfers;

    const actions = C.pageActions([
      { label: '+ New Transfer', onclick: 'FinanceRenderer.newTransfer()', variant: 'primary' },
    ]);

    const emiCards = `<div class="emi-grid">
      ${emis.map(e => C.emiCard(e)).join('')}
    </div>`;

    const headers = ['ID', 'From', 'To', 'Amount', 'Currency', 'Status', 'Requested', 'Requested By', 'Approved By', 'Actions'];
    const rows = transfers.map(t => `<tr>
      <td>${U.escape(t.id)}</td>
      <td>${U.escape(t.fromName)}</td>
      <td>${U.escape(t.toName)}</td>
      <td class="text-right">${U.money(t.amount, t.currency)}</td>
      <td>${U.escape(t.currency)}</td>
      <td>${C.badge(t.status)}</td>
      <td>${U.datetime(t.requestedAt)}</td>
      <td>${U.escape(t.requestedBy)}</td>
      <td>${t.approvedBy ? U.escape(t.approvedBy) : '-'}</td>
      <td>${t.status === 'pending' ? C.actionBtn('Approve', `FinanceRenderer.approveTransfer('${t.id}')`, 'success') : '-'}</td>
    </tr>`);

    const transfersCard = C.card('Inter-EMI Transfers', C.simpleTable(headers, rows));

    U.$('#view-emi').innerHTML = `${actions}${emiCards}${transfersCard}`;
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

    const overdueCount = calls.filter(c => c.status === 'overdue').length;
    const kpis = C.kpiGrid([
      C.kpi('Overdue', overdueCount, undefined, { variant: overdueCount > 0 ? 'danger' : undefined }),
      C.kpi('Pending', calls.filter(c => c.status === 'pending').length, undefined, { variant: 'warning' }),
      C.kpi('Total Outstanding', U.money(calls.filter(c => c.status !== 'funded').reduce((s, c) => s + c.amount, 0))),
      C.kpi('Funded', calls.filter(c => c.status === 'funded').length),
    ], 4);

    const headers = ['ID', 'LP', 'Amount', 'Currency', 'Due Date', 'Status', 'Requested', 'Actions'];
    const rows = calls.map(c => `<tr class="${c.status === 'overdue' ? 'row-danger' : ''}">
      <td>${U.escape(c.id)}</td>
      <td><strong>${U.escape(c.lpName)}</strong></td>
      <td class="text-right">${U.money(c.amount, c.currency)}</td>
      <td>${U.escape(c.currency)}</td>
      <td class="${c.status === 'overdue' ? 'text-danger' : ''}">${U.date(c.dueDate)}</td>
      <td>${C.badge(c.status)}</td>
      <td>${U.datetime(c.requestedAt)}</td>
      <td>${c.status === 'pending' || c.status === 'overdue' ? C.actionBtn('Fund', `FinanceRenderer.fundMarginCall('${c.id}')`, 'success') : '-'}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-lp-margin-calls').innerHTML = `${kpis}${table}`;
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

    const headers = ['Gateway', 'Period', 'Deposits', 'Withdrawals', 'Fees', 'Net Settlement', 'Expected', 'Actual', 'Variance', 'Status', 'Settled'];
    const rows = settlements.map(g => `<tr class="${g.status === 'discrepancy' ? 'row-warning' : ''}">
      <td><strong>${U.escape(g.gateway)}</strong></td>
      <td>${U.escape(g.period)}</td>
      <td class="text-right">${U.money(g.totalDeposits)}</td>
      <td class="text-right">${U.money(g.totalWithdrawals)}</td>
      <td class="text-right negative">${U.money(g.fees)}</td>
      <td class="text-right">${U.money(g.netSettlement)}</td>
      <td class="text-right">${U.money(g.expectedAmount)}</td>
      <td class="text-right">${U.money(g.actualAmount)}</td>
      <td class="text-right ${g.variance !== 0 ? 'text-danger' : ''}">${U.money(g.variance)}</td>
      <td>${C.badge(g.status === 'reconciled' ? 'matched' : g.status === 'discrepancy' ? 'break' : 'pending')}</td>
      <td>${g.settledAt ? U.date(g.settledAt) : '-'}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-gateway-recon').innerHTML = table;
  },

  // IB Payouts
  renderIBPayouts() {
    Header.setTitle('IB Payouts');
    const payouts = S.finance.ibPayouts;

    const kpis = C.kpiGrid([
      C.kpi('Total Pending', U.money(payouts.filter(p => p.status === 'pending' || p.status === 'approved').reduce((s, p) => s + p.netAmount, 0))),
      C.kpi('Pending Count', payouts.filter(p => p.status === 'pending').length),
      C.kpi('Approved', payouts.filter(p => p.status === 'approved').length),
      C.kpi('Paid', payouts.filter(p => p.status === 'paid').length),
    ], 4);

    const actions = C.pageActions([
      { label: 'Bulk Approve All Pending', onclick: 'FinanceRenderer.bulkApprovePayout()', variant: 'primary' },
      { label: 'Pay All Approved', onclick: 'FinanceRenderer.bulkPayApproved()', variant: 'success' },
    ]);

    const headers = ['IB', 'Period', 'Gross', 'Adjustments', 'Net', 'Method', 'Status', 'Scheduled', 'Actions'];
    const rows = payouts.map(p => `<tr>
      <td><strong>${U.escape(p.ibName)}</strong></td>
      <td>${U.escape(p.period)}</td>
      <td class="text-right">${U.money(p.grossAmount)}</td>
      <td class="text-right negative">${U.money(p.adjustments)}</td>
      <td class="text-right"><strong>${U.money(p.netAmount)}</strong></td>
      <td>${U.escape(p.method)}</td>
      <td>${C.badge(p.status)}</td>
      <td>${U.date(p.scheduledDate)}</td>
      <td>${p.status === 'pending' ? `${C.actionBtn('Approve', `FinanceRenderer.approvePayout('${p.ibId}')`, 'success')}${C.actionBtn('Hold', `FinanceRenderer.holdPayout('${p.ibId}')`, 'warning')}` : ''}${p.status === 'approved' ? C.actionBtn('Mark Paid', `FinanceRenderer.payPayout('${p.ibId}')`, 'primary') : ''}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-ib-payouts').innerHTML = `${kpis}${actions}${table}`;
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

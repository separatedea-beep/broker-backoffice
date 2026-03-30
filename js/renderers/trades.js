/**
 * Trade Administration — history, swaps, corporate actions, disputes
 */
const TradesRenderer = {
  render() {
    Header.setTitle('Trade History');
    const f = S.trades.filters;

    U.$('#view-trades').innerHTML = `
      <div class="card">
        <div id="trades-table"></div>
      </div>
    `;

    let list = S.trades.history;
    if (f.symbol) list = list.filter(t => t.symbol === f.symbol);
    if (f.account) list = list.filter(t => t.accountId === f.account || String(t.accountLogin).includes(f.account));

    Table.render('trades-table', {
      title: `${list.length} Trades`,
      filters: `
        <input type="text" class="form-control form-sm" placeholder="Account..." value="${f.account}" oninput="S.trades.filters.account=this.value; TradesRenderer.render()">
        <select class="form-control form-sm" onchange="S.trades.filters.symbol=this.value; TradesRenderer.render()">
          <option value="">All Symbols</option>
          ${[...new Set(S.trades.history.map(t => t.symbol))].sort().map(s => `<option value="${s}" ${f.symbol === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      `,
      columns: [
        { key: 'ticket', label: 'Ticket', width: '80px' },
        { key: 'accountLogin', label: 'Login', width: '60px' },
        { key: 'symbol', label: 'Symbol' },
        { key: 'direction', label: 'Dir', render: (v) => `<span class="badge ${v === 'buy' ? 'badge-success' : 'badge-danger'}">${v}</span>` },
        { key: 'volume', label: 'Volume', align: 'right', render: (v) => U.lots(v) },
        { key: 'openPrice', label: 'Open', align: 'right' },
        { key: 'closePrice', label: 'Close', align: 'right' },
        { key: 'pnl', label: 'P&L', align: 'right', render: (v) => `<span class="${U.pnlClass(v)}">${U.pnlSign(v)}${U.money(v)}</span>` },
        { key: 'commission', label: 'Comm.', align: 'right', render: (v) => U.money(v) },
        { key: 'swap', label: 'Swap', align: 'right', render: (v) => U.money(v) },
        { key: 'book', label: 'Book', render: (v) => `<span class="badge ${v === 'a_book' ? 'badge-info' : 'badge-purple'}">${v === 'a_book' ? 'A' : 'B'}</span>` },
        { key: 'lp', label: 'LP' },
        { key: 'fillLatency', label: 'Lat(ms)', align: 'right', render: (v) => `<span class="${v > CONFIG.THRESHOLDS.LATENCY_WARNING ? 'text-warning' : ''}">${v}</span>` },
        { key: 'slippage', label: 'Slip', align: 'right', render: (v) => `<span class="${Math.abs(v) > CONFIG.THRESHOLDS.SLIPPAGE_WARNING ? 'text-warning' : ''}">${U.pips(v)}</span>` },
        { key: 'closeTime', label: 'Closed', render: (v) => U.datetime(v) },
        { key: 'disputeFlag', label: '!', width: '30px', render: (v) => v ? '<span class="text-danger" title="Disputed">&#9888;</span>' : '' },
      ],
      data: list,
      page: S.trades.page,
      exportable: true,
    });
  },

  // Swaps & Rollovers
  renderSwaps() {
    Header.setTitle('Swaps & Rollovers');
    U.$('#view-swaps').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Current Swap Rates</h3></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Symbol</th><th>Long Swap</th><th>Short Swap</th><th>Triple Day</th><th>Positions Affected</th><th>Total Charged</th><th>Last Rollover</th><th>Actions</th></tr></thead>
            <tbody>
              ${S.trades.swapRollovers.map(s => `<tr>
                <td><strong>${s.symbol}</strong></td>
                <td class="${s.longSwap < 0 ? 'negative' : 'positive'}">${U.num(s.longSwap)}</td>
                <td class="${s.shortSwap < 0 ? 'negative' : 'positive'}">${U.num(s.shortSwap)}</td>
                <td>${s.tripleDay}</td>
                <td>${s.positionsAffected}</td>
                <td class="negative">${U.money(s.totalSwapCharged)}</td>
                <td>${U.date(s.lastRollover)}</td>
                <td><button class="btn btn-xs btn-secondary" onclick="TradesRenderer.editSwap('${s.symbol}')">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  editSwap(symbol) {
    const s = S.trades.swapRollovers.find(x => x.symbol === symbol);
    if (!s) return;
    Modal.form('Edit Swap — ' + symbol, [
      { name: 'longSwap', label: 'Long Swap (points)', type: 'number', value: s.longSwap },
      { name: 'shortSwap', label: 'Short Swap (points)', type: 'number', value: s.shortSwap },
      { name: 'tripleDay', label: 'Triple Swap Day', type: 'select', options: ['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => ({ value: d, label: d })), value: s.tripleDay },
    ], (data) => {
      s.longSwap = parseFloat(data.longSwap);
      s.shortSwap = parseFloat(data.shortSwap);
      s.tripleDay = data.tripleDay;
      Toast.success('Swap rates updated for ' + symbol);
      BO.renderCurrentView();
    });
  },

  // Corporate Actions
  renderCorporateActions() {
    Header.setTitle('Corporate Actions');
    U.$('#view-corporate-actions').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="TradesRenderer.newCorporateAction()">+ New Action</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Symbol</th><th>Type</th><th>Details</th><th>Ex-Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${S.trades.corporateActions.map(ca => `<tr>
                <td>${ca.id}</td>
                <td><strong>${ca.symbol}</strong></td>
                <td><span class="badge badge-info">${ca.type.replace(/_/g, ' ')}</span></td>
                <td>${ca.ratio || (ca.amount ? U.money(ca.amount) : '-')}</td>
                <td>${ca.exDate}</td>
                <td><span class="badge ${U.statusClass(ca.status)}">${ca.status}</span></td>
                <td>${ca.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="TradesRenderer.processCorporateAction('${ca.id}')">Process</button>` : '-'}</td>
              </tr>`).join('')}
              ${S.trades.dividendAdjustments.map(d => `<tr>
                <td>${d.id}</td>
                <td><strong>${d.symbol}</strong></td>
                <td><span class="badge badge-success">dividend</span></td>
                <td>${U.money(d.amount, d.currency)} per contract</td>
                <td>${d.exDate}</td>
                <td><span class="badge ${U.statusClass(d.status)}">${d.status}</span> (${d.positionsAffected} pos)</td>
                <td>${d.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="TradesRenderer.processDividend('${d.id}')">Process</button>` : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  newCorporateAction() {
    Modal.form('New Corporate Action', [
      { name: 'symbol', label: 'Symbol', type: 'select', options: S.platform.symbols.filter(s => s.type === 'Index').map(s => ({ value: s.symbol, label: s.symbol })) },
      { name: 'type', label: 'Type', type: 'select', options: ['stock_split','reverse_split','dividend','rights_issue','merger'].map(v => ({ value: v, label: v.replace(/_/g, ' ') })) },
      { name: 'ratio', label: 'Ratio / Amount' },
      { name: 'exDate', label: 'Ex-Date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ], (data) => {
      S.trades.corporateActions.push({ id: 'CA' + U.uid(), symbol: data.symbol, type: data.type, ratio: data.ratio, exDate: data.exDate, status: 'pending', notes: data.notes });
      Toast.success('Corporate action created');
      BO.renderCurrentView();
    });
  },

  processCorporateAction(id) {
    const ca = S.trades.corporateActions.find(x => x.id === id);
    if (ca) ca.status = 'completed';
    Toast.success('Corporate action processed');
    BO.renderCurrentView();
  },

  processDividend(id) {
    const d = S.trades.dividendAdjustments.find(x => x.id === id);
    if (d) d.status = 'completed';
    Toast.success('Dividend adjustment processed');
    BO.renderCurrentView();
  },

  // Disputes
  renderDisputes() {
    Header.setTitle('Trade Disputes');
    U.$('#view-disputes').innerHTML = `
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Ticket</th><th>Account</th><th>Symbol</th><th>Issue</th><th>Priority</th><th>Status</th><th>Claimed Loss</th><th>Compensation</th><th>Assigned</th><th>Opened</th><th>Actions</th></tr></thead>
            <tbody>
              ${S.trades.disputes.map(d => `<tr>
                <td>${d.id}</td>
                <td>${d.ticket}</td>
                <td>${d.accountId}</td>
                <td>${d.symbol}</td>
                <td class="text-sm">${d.issue}</td>
                <td><span class="badge ${d.priority === 'high' ? 'badge-danger' : d.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${d.priority}</span></td>
                <td><span class="badge ${U.statusClass(d.status)}">${d.status}</span></td>
                <td>${U.money(d.claimedLoss)}</td>
                <td>${U.money(d.compensation)}</td>
                <td>${d.assignedTo}</td>
                <td>${U.date(d.openedAt)}</td>
                <td>
                  ${d.status === 'open' || d.status === 'investigating' ? `
                    <button class="btn btn-xs btn-success" onclick="TradesRenderer.resolveDispute('${d.id}', 'resolved_broker')">Resolve (Broker)</button>
                    <button class="btn btn-xs btn-warning" onclick="TradesRenderer.resolveDispute('${d.id}', 'resolved_client')">Resolve (Client)</button>
                  ` : '-'}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  resolveDispute(id, resolution) {
    const d = S.trades.disputes.find(x => x.id === id);
    if (d) {
      d.status = resolution;
      if (resolution === 'resolved_client') {
        Modal.form('Compensation Amount', [
          { name: 'amount', label: 'Compensation ($)', type: 'number', value: d.claimedLoss },
        ], (data) => {
          d.compensation = parseFloat(data.amount) || 0;
          Toast.success('Dispute resolved — client compensated');
          BO.renderCurrentView();
        });
        return;
      }
    }
    Toast.success('Dispute resolved');
    BO.renderCurrentView();
  },
};

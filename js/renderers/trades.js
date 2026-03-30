/**
 * Trade Administration — history, swaps, corporate actions, disputes
 */
const TradesRenderer = {
  render() {
    Header.setTitle('Trade History');
    const f = S.trades.filters;

    let list = S.trades.history;
    if (f.symbol) list = list.filter(t => t.symbol === f.symbol);
    if (f.account) list = list.filter(t => t.accountId === f.account || String(t.accountLogin).includes(f.account));

    U.$('#view-trades').innerHTML = `
      ${C.card('', '<div id="trades-table"></div>')}
    `;

    const filters = C.filterBar([
      { type: 'search', placeholder: 'Account...', value: f.account, onChange: "S.trades.filters.account=this.value; TradesRenderer.render()" },
      { type: 'select', label: 'Symbols', value: f.symbol, onChange: "S.trades.filters.symbol=this.value; TradesRenderer.render()", options: [
        { value: '', label: 'All Symbols' },
        ...[...new Set(S.trades.history.map(t => t.symbol))].sort().map(s => ({ value: s, label: s })),
      ]},
    ]);

    Table.render('trades-table', {
      title: `${list.length} Trades`,
      filters,
      columns: [
        Columns.text('ticket', 'Ticket', { width: '80px' }),
        Columns.text('accountLogin', 'Login', { width: '60px' }),
        Columns.text('symbol', 'Symbol'),
        Columns.direction('direction'),
        Columns.lots('volume'),
        { key: 'openPrice', label: 'Open', align: 'right' },
        { key: 'closePrice', label: 'Close', align: 'right' },
        Columns.pnl('pnl', 'P&L'),
        Columns.money('commission', 'Comm.'),
        Columns.money('swap', 'Swap'),
        Columns.book('book'),
        Columns.text('lp', 'LP'),
        Columns.latency('fillLatency', 'Lat(ms)'),
        Columns.slippage('slippage', 'Slip'),
        Columns.datetime('closeTime', 'Closed'),
        Columns.disputeFlag('disputeFlag'),
      ],
      data: list,
      page: S.trades.page,
      exportable: true,
    });
  },

  // Swaps & Rollovers
  renderSwaps() {
    Header.setTitle('Swaps & Rollovers');

    const swapBody = C.simpleTable(
      ['Symbol', 'Long Swap', 'Short Swap', 'Triple Day', 'Positions Affected', 'Total Charged', 'Last Rollover', 'Actions'],
      S.trades.swapRollovers.map(s => `<tr>
        <td><strong>${U.escape(s.symbol)}</strong></td>
        <td class="${s.longSwap < 0 ? 'negative' : 'positive'}">${U.num(s.longSwap)}</td>
        <td class="${s.shortSwap < 0 ? 'negative' : 'positive'}">${U.num(s.shortSwap)}</td>
        <td>${U.escape(s.tripleDay)}</td>
        <td>${s.positionsAffected}</td>
        <td class="negative">${U.money(s.totalSwapCharged)}</td>
        <td>${U.date(s.lastRollover)}</td>
        <td>${C.actionBtn('Edit', "TradesRenderer.editSwap('" + s.symbol + "')")}</td>
      </tr>`)
    );

    U.$('#view-swaps').innerHTML = C.card('Current Swap Rates', swapBody);
  },

  editSwap(symbol) {
    const s = S.trades.swapRollovers.find(x => x.symbol === symbol);
    if (!s) return;
    Modal.form('Edit Swap \u2014 ' + symbol, [
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

    const actions = C.pageActions([
      { label: '+ New Action', onclick: "TradesRenderer.newCorporateAction()", variant: 'primary' },
    ]);

    const allActions = [
      ...S.trades.corporateActions.map(ca => ({
        id: ca.id,
        symbol: ca.symbol,
        type: ca.type,
        details: ca.ratio || (ca.amount ? U.money(ca.amount) : '-'),
        exDate: ca.exDate,
        status: ca.status,
        extra: '',
        isPending: ca.status === 'pending',
        processAction: `TradesRenderer.processCorporateAction('${ca.id}')`,
      })),
      ...S.trades.dividendAdjustments.map(d => ({
        id: d.id,
        symbol: d.symbol,
        type: 'dividend',
        details: U.money(d.amount, d.currency) + ' per contract',
        exDate: d.exDate,
        status: d.status,
        extra: ` (${d.positionsAffected} pos)`,
        isPending: d.status === 'pending',
        processAction: `TradesRenderer.processDividend('${d.id}')`,
      })),
    ];

    const tableBody = C.simpleTable(
      ['ID', 'Symbol', 'Type', 'Details', 'Ex-Date', 'Status', 'Actions'],
      allActions.map(a => `<tr>
        <td>${U.escape(a.id)}</td>
        <td><strong>${U.escape(a.symbol)}</strong></td>
        <td>${C.badge(U.statusLabel(a.type), 'info')}</td>
        <td>${a.details}</td>
        <td>${U.escape(a.exDate)}</td>
        <td>${C.badge(a.status)}${a.extra}</td>
        <td>${a.isPending ? C.actionBtn('Process', a.processAction, 'success') : '-'}</td>
      </tr>`)
    );

    U.$('#view-corporate-actions').innerHTML = `
      ${actions}
      ${C.card('', tableBody)}
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

    const tableBody = C.simpleTable(
      ['ID', 'Ticket', 'Account', 'Symbol', 'Issue', 'Priority', 'Status', 'Claimed Loss', 'Compensation', 'Assigned', 'Opened', 'Actions'],
      S.trades.disputes.map(d => `<tr>
        <td>${U.escape(d.id)}</td>
        <td>${U.escape(d.ticket)}</td>
        <td>${U.escape(d.accountId)}</td>
        <td>${U.escape(d.symbol)}</td>
        <td class="text-sm">${U.escape(d.issue)}</td>
        <td>${C.priorityBadge(d.priority)}</td>
        <td>${C.badge(d.status)}</td>
        <td>${U.money(d.claimedLoss)}</td>
        <td>${U.money(d.compensation)}</td>
        <td>${U.escape(d.assignedTo)}</td>
        <td>${U.date(d.openedAt)}</td>
        <td>
          ${d.status === 'open' || d.status === 'investigating' ? `
            ${C.actionBtn('Resolve (Broker)', "TradesRenderer.resolveDispute('" + d.id + "', 'resolved_broker')", 'success')}
            ${C.actionBtn('Resolve (Client)', "TradesRenderer.resolveDispute('" + d.id + "', 'resolved_client')", 'warning')}
          ` : '-'}
        </td>
      </tr>`)
    );

    U.$('#view-disputes').innerHTML = C.card('', tableBody);
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
          Toast.success('Dispute resolved \u2014 client compensated');
          BO.renderCurrentView();
        });
        return;
      }
    }
    Toast.success('Dispute resolved');
    BO.renderCurrentView();
  },
};

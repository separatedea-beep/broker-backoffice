/**
 * Dealing Desk — live positions, rerouting, requotes, news risk, stop-out review
 */
const DealingDeskRenderer = {
  _refreshInterval: null,

  // Live Monitor
  render() {
    Header.setTitle('Live Monitor');
    const dd = S.dealingDesk;
    const positions = dd.livePositions;
    const f = dd.filters;

    let filtered = positions;
    if (f.symbol !== 'all') filtered = filtered.filter(p => p.symbol === f.symbol);
    if (f.book !== 'all') filtered = filtered.filter(p => p.book === f.book);
    if (f.minSize > 0) filtered = filtered.filter(p => p.volume >= f.minSize);

    const totalUnrealized = filtered.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalVolume = filtered.reduce((s, p) => s + p.volume, 0);

    const kpis = C.kpiGrid([
      C.kpi('Open Positions', filtered.length),
      C.kpi('Total Volume', `${U.lots(totalVolume)} lots`),
      C.kpiPnl('Unrealized P&L', totalUnrealized),
      C.kpi('A-Book Positions', filtered.filter(p => p.book === 'a_book').length),
      C.kpi('B-Book Positions', filtered.filter(p => p.book === 'b_book').length),
      C.kpi('Stop-Out Queue', dd.stopoutQueue.length, undefined,
        { variant: dd.stopoutQueue.length > 0 ? 'danger' : undefined }),
    ]);

    const exposureCard = C.card('Net Exposure by Symbol',
      `<div class="exposure-grid">${
        Object.entries(dd.exposure)
          .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
          .map(([sym, e]) => C.exposureCell(sym, e)).join('')
      }</div>`);

    const symbolOpts = [...new Set(positions.map(p => p.symbol))].sort()
      .map(s => ({ value: s, label: s }));

    const filters = C.filterBar([
      { type: 'select', label: 'Symbols', value: f.symbol,
        options: ['all', ...symbolOpts],
        onChange: "S.dealingDesk.filters.symbol=this.value; DealingDeskRenderer.render()" },
      { type: 'select', label: 'Books', value: f.book,
        options: [
          { value: 'all', label: 'All Books' },
          { value: 'a_book', label: 'A-Book' },
          { value: 'b_book', label: 'B-Book' },
        ],
        onChange: "S.dealingDesk.filters.book=this.value; DealingDeskRenderer.render()" },
    ]);

    const sortedPositions = filtered.sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl));

    const positionRows = sortedPositions.map(p => `<tr class="${Math.abs(p.unrealizedPnl) > 3000 ? 'row-highlight' : ''}">
      <td>${p.ticket}</td>
      <td>${p.login}</td>
      <td>${p.name}</td>
      <td><strong>${p.symbol}</strong></td>
      <td>${C.dirBadge(p.direction)}</td>
      <td>${U.lots(p.volume)}</td>
      <td>${U.num(p.openPrice, 5)}</td>
      <td>${U.num(p.currentPrice, 5)}</td>
      <td>${C.pnlBold(p.unrealizedPnl)}</td>
      <td>${U.money(p.swap)}</td>
      <td>${C.bookBadge(p.book)}</td>
      <td>${p.lp}</td>
      <td>${U.ago(p.openTime)}</td>
      <td>${C.actionBtn('Close', `DealingDeskRenderer.closePosition(${p.ticket})`, 'danger')}</td>
    </tr>`);

    const positionsTable = C.simpleTable(
      ['Ticket', 'Login', 'Name', 'Symbol', 'Dir', 'Volume', 'Open', 'Current', 'P&L', 'Swap', 'Book', 'LP', 'Open Time', 'Actions'],
      positionRows,
      { compact: true });

    const positionsCard = C.card('Live Positions', positionsTable, { filters });

    U.$('#view-dealing-desk').innerHTML = `${kpis}${exposureCard}${positionsCard}`;
  },

  closePosition(ticket) {
    Modal.confirm('Close Position', `Close position #${ticket}?`, () => {
      API.closePosition(ticket);
      Toast.success('Position closed');
      this.render();
    });
  },

  // A/B Book Routing
  renderRerouting() {
    Header.setTitle('A/B Book Routing');
    const routing = S.dealingDesk.routing;

    const rows = routing.map(r => `<tr>
      <td>${r.login}</td>
      <td>${r.name}</td>
      <td>${U.pct((r.winRate || 0) * 100)}</td>
      <td class="${(r.edgePerTrade || 0) >= 0 ? 'positive' : 'negative'}">${U.money(r.edgePerTrade || 0)}</td>
      <td>${U.pct((r.kellyFraction || 0) * 100)}</td>
      <td>${C.porBadge(r.por || 0)}</td>
      <td>${C.toxBadge(r.toxicity)}</td>
      <td>${C.bookBadge(r.currentBook)}</td>
      <td><span class="badge ${r.recommendation === 'a_book' ? 'badge-info' : r.recommendation === 'b_book' ? 'badge-purple' : 'badge-warning'}">${r.recommendation === 'a_book' ? 'A-BOOK' : r.recommendation === 'b_book' ? 'B-BOOK' : 'REVIEW'}</span></td>
      <td class="text-sm" style="max-width:250px;white-space:normal">${r.reason}</td>
      <td>
        ${r.currentBook === 'b_book'
          ? C.actionBtn('&#8594; A', `DealingDeskRenderer.reroute('${r.accountId}', 'a_book')`, 'info')
          : C.actionBtn('&#8594; B', `DealingDeskRenderer.reroute('${r.accountId}', 'b_book')`, 'purple')}
        ${C.actionBtn('Analyze', `RuinRenderer.selectAccount('${r.accountId}'); BO.navigate('ruin-analysis')`, 'secondary')}
      </td>
    </tr>`);

    const table = C.simpleTable(
      ['Login', 'Name', 'Win Rate', 'Edge/Trade', 'Kelly %', 'PoR', 'Toxicity', 'Current', 'Recommended', 'Reason', 'Actions'],
      rows);

    const routingCard = C.card('Account Routing Table — PoR-Enhanced', table, {
      actions: `<a class="btn btn-sm btn-primary" onclick="BO.navigate('ruin-analysis')">Open Ruin Analysis</a>`,
    });

    U.$('#view-rerouting').innerHTML = routingCard;
  },

  reroute(accountId, newBook) {
    Modal.form('Reroute Account', [
      { name: 'reason', label: 'Reason', type: 'select', options: ['Risk limit','News event','Manual override','Concentration','Suspicious activity'].map(v => ({ value: v, label: v })) },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ], (data) => {
      API.rerouteAccount(accountId, newBook, data.reason);
      Toast.success(`Account rerouted to ${newBook === 'a_book' ? 'A-Book' : 'B-Book'}`);
      this.renderRerouting();
    });
  },

  // Requotes & Slippage
  renderRequotes() {
    Header.setTitle('Requotes & Slippage');
    const rq = S.dealingDesk.requotes;
    const avgSlippage = rq.reduce((s, r) => s + Math.abs(r.slippage), 0) / (rq.length || 1);
    const acceptRate = (rq.filter(r => r.accepted).length / (rq.length || 1)) * 100;

    const kpis = C.kpiGrid([
      C.kpi('Total Requotes', rq.length),
      C.kpi('Accept Rate', U.pct(acceptRate)),
      C.kpi('Avg Slippage', `${U.pips(avgSlippage)} pips`),
      C.kpi('Rejected', rq.filter(r => !r.accepted).length),
    ], 4);

    const rows = rq.map(r => `<tr>
      <td>${U.datetime(r.timestamp)}</td>
      <td>${r.login}</td>
      <td>${r.symbol}</td>
      <td>${C.dirBadge(r.direction)}</td>
      <td>${U.lots(r.volume)}</td>
      <td>${U.num(r.requestedPrice, 5)}</td>
      <td>${U.num(r.offeredPrice, 5)}</td>
      <td>${C.slippage(r.slippage)}</td>
      <td>${r.accepted ? C.badge('Yes', 'success') : C.badge('No', 'danger')}</td>
      <td class="text-sm">${r.reason}</td>
    </tr>`);

    const table = C.simpleTable(
      ['Time', 'Login', 'Symbol', 'Dir', 'Vol', 'Requested', 'Offered', 'Slippage', 'Accepted', 'Reason'],
      rows,
      { compact: true });

    const tableCard = C.card(null, table);

    U.$('#view-requotes').innerHTML = `${kpis}${tableCard}`;
  },

  // News & Events
  renderNews() {
    Header.setTitle('News & Event Risk');
    const events = S.dealingDesk.newsEvents;

    const actions = C.pageActions([
      { label: '+ Add Event', onclick: 'DealingDeskRenderer.addNewsEvent()', variant: 'primary' },
    ]);

    const rows = events.map(e => `<tr>
      <td><strong>${e.name}</strong></td>
      <td>${U.datetime(e.time)}</td>
      <td>${C.impactBadge(e.impact)}</td>
      <td>${e.spreadMultiplier}x</td>
      <td>${e.marginMultiplier}x</td>
      <td class="text-sm">${e.affectedSymbols.join(', ')}</td>
      <td>${C.badge(e.status)}</td>
      <td>${C.actionBtn('Edit', `DealingDeskRenderer.editNewsEvent('${e.id}')`, 'secondary')}</td>
    </tr>`);

    const table = C.simpleTable(
      ['Event', 'Time', 'Impact', 'Spread Mult.', 'Margin Mult.', 'Affected Symbols', 'Status', 'Actions'],
      rows);

    const tableCard = C.card('Upcoming High-Impact Events', table);

    U.$('#view-news-risk').innerHTML = `${actions}${tableCard}`;
  },

  addNewsEvent() {
    Modal.form('Add News Event', [
      { name: 'name', label: 'Event Name', placeholder: 'US Non-Farm Payrolls' },
      { name: 'time', label: 'Date/Time', type: 'datetime-local' },
      { name: 'impact', label: 'Impact', type: 'select', options: [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
      { name: 'spreadMultiplier', label: 'Spread Multiplier', type: 'number', value: 3 },
      { name: 'marginMultiplier', label: 'Margin Multiplier', type: 'number', value: 2 },
    ], (data) => {
      S.dealingDesk.newsEvents.push({ id: 'NE' + U.uid(), name: data.name, time: new Date(data.time), impact: data.impact, spreadMultiplier: parseFloat(data.spreadMultiplier), marginMultiplier: parseFloat(data.marginMultiplier), affectedSymbols: ['EURUSD','GBPUSD','USDJPY','XAUUSD'], status: 'scheduled' });
      Toast.success('News event added');
      this.renderNews();
    });
  },

  editNewsEvent(id) {
    const e = S.dealingDesk.newsEvents.find(x => x.id === id);
    if (!e) return;
    Modal.form('Edit News Event — ' + e.name, [
      { name: 'spreadMultiplier', label: 'Spread Multiplier', type: 'number', value: e.spreadMultiplier },
      { name: 'marginMultiplier', label: 'Margin Multiplier', type: 'number', value: e.marginMultiplier },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled','active','expired'].map(v => ({ value: v, label: v })), value: e.status },
    ], (data) => {
      e.spreadMultiplier = parseFloat(data.spreadMultiplier);
      e.marginMultiplier = parseFloat(data.marginMultiplier);
      e.status = data.status;
      Toast.success('Event updated');
      this.renderNews();
    });
  },

  // Stop-Out Review
  renderStopouts() {
    Header.setTitle('Stop-Out Review');
    const queue = S.dealingDesk.stopoutQueue;

    const kpis = C.kpiGrid([
      C.kpi('Accounts at Risk', queue.length, undefined, { variant: 'danger' }),
      C.kpi('Large Accounts', queue.filter(q => q.isLargeAccount).length),
      C.kpi('Pending Review', queue.filter(q => q.reviewStatus === 'pending').length),
      C.kpi('Avg Margin Level', U.pct(queue.reduce((s, q) => s + q.marginLevel, 0) / (queue.length || 1), 0)),
    ], 4);

    const rows = queue.sort((a, b) => a.marginLevel - b.marginLevel).map(q => `<tr class="${q.marginLevel < CONFIG.THRESHOLDS.STOPOUT_LEVEL ? 'row-danger' : q.marginLevel < CONFIG.THRESHOLDS.MARGIN_LEVEL_DANGER ? 'row-warning' : ''}">
      <td>${q.login}</td>
      <td>${q.name}</td>
      <td>${U.money(q.equity)}</td>
      <td>${U.money(q.margin)}</td>
      <td>${C.marginLevel(q.marginLevel)}</td>
      <td>${C.pnl(q.unrealizedPnl)}</td>
      <td>${q.openPositions}</td>
      <td>${q.isLargeAccount ? C.badge('LARGE', 'warning') : '-'}</td>
      <td>${C.badge(q.reviewStatus)}</td>
      <td>
        ${C.actionBtn('Approve', `DealingDeskRenderer.approveStopout('${q.accountId}')`, 'success')}
        ${C.actionBtn('Defer', `DealingDeskRenderer.deferStopout('${q.accountId}')`, 'warning')}
      </td>
    </tr>`);

    const table = C.simpleTable(
      ['Login', 'Name', 'Equity', 'Margin', 'Margin Level', 'Unreal. P&L', 'Positions', 'Large?', 'Review', 'Actions'],
      rows);

    const tableCard = C.card(null, table);

    U.$('#view-stopout-review').innerHTML = `${kpis}${tableCard}`;
  },

  approveStopout(accountId) {
    const q = S.dealingDesk.stopoutQueue.find(x => x.accountId === accountId);
    if (q) q.reviewStatus = 'approved';
    Toast.success('Stop-out approved for execution');
    BO.renderCurrentView();
  },

  deferStopout(accountId) {
    const q = S.dealingDesk.stopoutQueue.find(x => x.accountId === accountId);
    if (q) q.reviewStatus = 'deferred';
    Toast.info('Stop-out deferred');
    BO.renderCurrentView();
  },
};

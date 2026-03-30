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

    U.$('#view-dealing-desk').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Open Positions</div><div class="kpi-value">${filtered.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Volume</div><div class="kpi-value">${U.lots(totalVolume)} lots</div></div>
        <div class="kpi-card"><div class="kpi-label">Unrealized P&L</div><div class="kpi-value ${U.pnlClass(totalUnrealized)}">${U.pnlSign(totalUnrealized)}${U.money(totalUnrealized)}</div></div>
        <div class="kpi-card"><div class="kpi-label">A-Book Positions</div><div class="kpi-value">${filtered.filter(p => p.book === 'a_book').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">B-Book Positions</div><div class="kpi-value">${filtered.filter(p => p.book === 'b_book').length}</div></div>
        <div class="kpi-card ${dd.stopoutQueue.length > 0 ? 'kpi-danger' : ''}"><div class="kpi-label">Stop-Out Queue</div><div class="kpi-value">${dd.stopoutQueue.length}</div></div>
      </div>

      <!-- Exposure Heatmap -->
      <div class="card">
        <div class="card-header"><h3>Net Exposure by Symbol</h3></div>
        <div class="card-body">
          <div class="exposure-grid">
            ${Object.entries(dd.exposure).sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net)).map(([sym, e]) => `
              <div class="exposure-cell ${Math.abs(e.net) > 15 ? 'exp-high' : Math.abs(e.net) > 5 ? 'exp-med' : 'exp-low'} ${e.net > 0 ? 'exp-long' : 'exp-short'}">
                <div class="exp-sym">${sym}</div>
                <div class="exp-net">${e.net > 0 ? '+' : ''}${U.lots(e.net)}</div>
                <div class="exp-detail">L: ${U.lots(e.long)} / S: ${U.lots(e.short)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Live Position Grid -->
      <div class="card">
        <div class="card-header">
          <h3>Live Positions</h3>
          <div class="card-filters">
            <select class="form-control form-sm" onchange="S.dealingDesk.filters.symbol=this.value; DealingDeskRenderer.render()">
              <option value="all">All Symbols</option>
              ${[...new Set(positions.map(p => p.symbol))].sort().map(s => `<option value="${s}" ${f.symbol === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select class="form-control form-sm" onchange="S.dealingDesk.filters.book=this.value; DealingDeskRenderer.render()">
              <option value="all" ${f.book==='all'?'selected':''}>All Books</option>
              <option value="a_book" ${f.book==='a_book'?'selected':''}>A-Book</option>
              <option value="b_book" ${f.book==='b_book'?'selected':''}>B-Book</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-scroll">
            <table class="data-table compact">
              <thead><tr>
                <th>Ticket</th><th>Login</th><th>Name</th><th>Symbol</th><th>Dir</th><th>Volume</th><th>Open</th><th>Current</th><th>P&L</th><th>Swap</th><th>Book</th><th>LP</th><th>Open Time</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${filtered.sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl)).map(p => `<tr class="${Math.abs(p.unrealizedPnl) > 3000 ? 'row-highlight' : ''}">
                  <td>${p.ticket}</td>
                  <td>${p.login}</td>
                  <td>${p.name}</td>
                  <td><strong>${p.symbol}</strong></td>
                  <td><span class="badge ${p.direction === 'buy' ? 'badge-success' : 'badge-danger'}">${p.direction}</span></td>
                  <td>${U.lots(p.volume)}</td>
                  <td>${U.num(p.openPrice, 5)}</td>
                  <td>${U.num(p.currentPrice, 5)}</td>
                  <td class="${U.pnlClass(p.unrealizedPnl)}"><strong>${U.pnlSign(p.unrealizedPnl)}${U.money(p.unrealizedPnl)}</strong></td>
                  <td>${U.money(p.swap)}</td>
                  <td><span class="badge ${p.book === 'a_book' ? 'badge-info' : 'badge-purple'}">${p.book === 'a_book' ? 'A' : 'B'}</span></td>
                  <td>${p.lp}</td>
                  <td>${U.ago(p.openTime)}</td>
                  <td><button class="btn btn-xs btn-danger" onclick="DealingDeskRenderer.closePosition(${p.ticket})">Close</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
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

    U.$('#view-rerouting').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Account Routing Table — PoR-Enhanced</h3>
          <a class="btn btn-sm btn-primary" onclick="BO.navigate('ruin-analysis')">Open Ruin Analysis</a>
        </div>
        <div class="card-body">
          <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Login</th><th>Name</th><th>Win Rate</th><th>Edge/Trade</th><th>Kelly %</th><th>PoR</th><th>Toxicity</th><th>Current</th><th>Recommended</th><th class="text-sm">Reason</th><th>Actions</th></tr></thead>
            <tbody>
              ${routing.map(r => `<tr>
                <td>${r.login}</td>
                <td>${r.name}</td>
                <td>${U.pct((r.winRate || 0) * 100)}</td>
                <td class="${(r.edgePerTrade || 0) >= 0 ? 'positive' : 'negative'}">${U.money(r.edgePerTrade || 0)}</td>
                <td>${U.pct((r.kellyFraction || 0) * 100)}</td>
                <td><span class="toxicity-badge ${(r.por || 0) > 0.6 ? 'tox-low' : (r.por || 0) > 0.2 ? 'tox-med' : 'tox-high'}">${U.pct((r.por || 0) * 100, 0)}</span></td>
                <td><span class="toxicity-badge ${r.toxicity > 70 ? 'tox-high' : r.toxicity > 40 ? 'tox-med' : 'tox-low'}">${r.toxicity}</span></td>
                <td><span class="badge ${r.currentBook === 'a_book' ? 'badge-info' : 'badge-purple'}">${r.currentBook === 'a_book' ? 'A' : 'B'}</span></td>
                <td><span class="badge ${r.recommendation === 'a_book' ? 'badge-info' : r.recommendation === 'b_book' ? 'badge-purple' : 'badge-warning'}">${r.recommendation === 'a_book' ? 'A-BOOK' : r.recommendation === 'b_book' ? 'B-BOOK' : 'REVIEW'}</span></td>
                <td class="text-sm" style="max-width:250px;white-space:normal">${r.reason}</td>
                <td>
                  ${r.currentBook === 'b_book' ? `<button class="btn btn-xs btn-info" onclick="DealingDeskRenderer.reroute('${r.accountId}', 'a_book')">&#8594; A</button>` : `<button class="btn btn-xs btn-purple" onclick="DealingDeskRenderer.reroute('${r.accountId}', 'b_book')">&#8594; B</button>`}
                  <button class="btn btn-xs btn-secondary" onclick="RuinRenderer.selectAccount('${r.accountId}'); BO.navigate('ruin-analysis')">Analyze</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    `;
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

    U.$('#view-requotes').innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><div class="kpi-label">Total Requotes</div><div class="kpi-value">${rq.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Accept Rate</div><div class="kpi-value">${U.pct(acceptRate)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Slippage</div><div class="kpi-value">${U.pips(avgSlippage)} pips</div></div>
        <div class="kpi-card"><div class="kpi-label">Rejected</div><div class="kpi-value">${rq.filter(r => !r.accepted).length}</div></div>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Time</th><th>Login</th><th>Symbol</th><th>Dir</th><th>Vol</th><th>Requested</th><th>Offered</th><th>Slippage</th><th>Accepted</th><th>Reason</th></tr></thead>
            <tbody>
              ${rq.map(r => `<tr>
                <td>${U.datetime(r.timestamp)}</td>
                <td>${r.login}</td>
                <td>${r.symbol}</td>
                <td><span class="badge ${r.direction === 'buy' ? 'badge-success' : 'badge-danger'}">${r.direction}</span></td>
                <td>${U.lots(r.volume)}</td>
                <td>${U.num(r.requestedPrice, 5)}</td>
                <td>${U.num(r.offeredPrice, 5)}</td>
                <td class="${Math.abs(r.slippage) > CONFIG.THRESHOLDS.SLIPPAGE_WARNING ? 'text-warning' : ''}">${U.pips(r.slippage)}</td>
                <td>${r.accepted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td>
                <td class="text-sm">${r.reason}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // News & Events
  renderNews() {
    Header.setTitle('News & Event Risk');
    const events = S.dealingDesk.newsEvents;

    U.$('#view-news-risk').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="DealingDeskRenderer.addNewsEvent()">+ Add Event</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>Upcoming High-Impact Events</h3></div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Event</th><th>Time</th><th>Impact</th><th>Spread Mult.</th><th>Margin Mult.</th><th>Affected Symbols</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${events.map(e => `<tr>
                <td><strong>${e.name}</strong></td>
                <td>${U.datetime(e.time)}</td>
                <td><span class="badge ${e.impact === 'high' ? 'badge-danger' : e.impact === 'medium' ? 'badge-warning' : 'badge-info'}">${e.impact}</span></td>
                <td>${e.spreadMultiplier}x</td>
                <td>${e.marginMultiplier}x</td>
                <td class="text-sm">${e.affectedSymbols.join(', ')}</td>
                <td><span class="badge ${U.statusClass(e.status)}">${e.status}</span></td>
                <td><button class="btn btn-xs btn-secondary" onclick="DealingDeskRenderer.editNewsEvent('${e.id}')">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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

    U.$('#view-stopout-review').innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card kpi-danger"><div class="kpi-label">Accounts at Risk</div><div class="kpi-value">${queue.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Large Accounts</div><div class="kpi-value">${queue.filter(q => q.isLargeAccount).length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Pending Review</div><div class="kpi-value">${queue.filter(q => q.reviewStatus === 'pending').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Margin Level</div><div class="kpi-value">${U.pct(queue.reduce((s,q) => s + q.marginLevel, 0) / (queue.length || 1), 0)}</div></div>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Login</th><th>Name</th><th>Equity</th><th>Margin</th><th>Margin Level</th><th>Unreal. P&L</th><th>Positions</th><th>Large?</th><th>Review</th><th>Actions</th></tr></thead>
            <tbody>
              ${queue.sort((a, b) => a.marginLevel - b.marginLevel).map(q => `<tr class="${q.marginLevel < CONFIG.THRESHOLDS.STOPOUT_LEVEL ? 'row-danger' : q.marginLevel < CONFIG.THRESHOLDS.MARGIN_LEVEL_DANGER ? 'row-warning' : ''}">
                <td>${q.login}</td>
                <td>${q.name}</td>
                <td>${U.money(q.equity)}</td>
                <td>${U.money(q.margin)}</td>
                <td class="text-danger"><strong>${U.pct(q.marginLevel, 0)}</strong></td>
                <td class="${U.pnlClass(q.unrealizedPnl)}">${U.money(q.unrealizedPnl)}</td>
                <td>${q.openPositions}</td>
                <td>${q.isLargeAccount ? '<span class="badge badge-warning">LARGE</span>' : '-'}</td>
                <td><span class="badge ${U.statusClass(q.reviewStatus)}">${q.reviewStatus}</span></td>
                <td>
                  <button class="btn btn-xs btn-success" onclick="DealingDeskRenderer.approveStopout('${q.accountId}')">Approve</button>
                  <button class="btn btn-xs btn-warning" onclick="DealingDeskRenderer.deferStopout('${q.accountId}')">Defer</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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

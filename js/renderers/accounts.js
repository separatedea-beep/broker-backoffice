/**
 * Account Management — list + detail views
 */
const AccountsRenderer = {
  render() {
    Header.setTitle('Client Accounts');
    const view = U.$('#view-accounts');
    const f = S.accounts.filters;

    view.innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="AccountsRenderer.openNew()">+ New Account</button>
      </div>
      <div class="card">
        <div id="accounts-table"></div>
      </div>
    `;

    const filtered = S.accounts.list.filter(a => {
      if (f.status !== 'all' && a.status !== f.status) return false;
      if (f.book !== 'all' && a.book !== f.book) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q) && !String(a.login).includes(q)) return false;
      }
      return true;
    });

    Table.render('accounts-table', {
      title: `${filtered.length} Accounts`,
      filters: `
        <input type="text" class="form-control form-sm" placeholder="Search name/ID/login..." value="${f.search}" oninput="S.accounts.filters.search=this.value; AccountsRenderer.render()">
        <select class="form-control form-sm" onchange="S.accounts.filters.status=this.value; AccountsRenderer.render()">
          <option value="all" ${f.status==='all'?'selected':''}>All Status</option>
          <option value="active" ${f.status==='active'?'selected':''}>Active</option>
          <option value="suspended" ${f.status==='suspended'?'selected':''}>Suspended</option>
          <option value="pending_review" ${f.status==='pending_review'?'selected':''}>Pending Review</option>
          <option value="closed" ${f.status==='closed'?'selected':''}>Closed</option>
        </select>
        <select class="form-control form-sm" onchange="S.accounts.filters.book=this.value; AccountsRenderer.render()">
          <option value="all" ${f.book==='all'?'selected':''}>All Books</option>
          <option value="a_book" ${f.book==='a_book'?'selected':''}>A-Book</option>
          <option value="b_book" ${f.book==='b_book'?'selected':''}>B-Book</option>
        </select>
      `,
      columns: [
        { key: 'login', label: 'Login', width: '70px' },
        { key: 'name', label: 'Name', render: (v, r) => `<span class="text-primary">${v}</span>` },
        { key: 'status', label: 'Status', render: (v) => `<span class="badge ${U.statusClass(v)}">${v}</span>` },
        { key: 'book', label: 'Book', render: (v) => `<span class="badge ${v === 'a_book' ? 'badge-info' : 'badge-purple'}">${v === 'a_book' ? 'A' : 'B'}</span>` },
        { key: 'group', label: 'Group' },
        { key: 'leverage', label: 'Lev', width: '50px', render: (v) => '1:' + v },
        { key: 'balance', label: 'Balance', align: 'right', render: (v) => U.money(v) },
        { key: 'equity', label: 'Equity', align: 'right', render: (v) => U.money(v) },
        { key: 'marginLevel', label: 'Margin %', align: 'right', render: (v) => `<span class="${v < 150 ? 'text-danger' : v < 300 ? 'text-warning' : ''}">${U.pct(v, 0)}</span>` },
        { key: 'toxicity', label: 'Toxicity', align: 'center', render: (v) => `<span class="toxicity-badge ${v > 70 ? 'tox-high' : v > 40 ? 'tox-med' : 'tox-low'}">${v}</span>` },
        { key: 'openPositions', label: 'Pos', width: '40px', align: 'center' },
      ],
      data: filtered,
      page: S.accounts.page,
      onRowClick: 'AccountsRenderer.showDetail',
      actions: (row) => `
        <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); AccountsRenderer.editAccount('${row.id}')" title="Edit">Edit</button>
        ${row.status === 'active' ? `<button class="btn btn-xs btn-warning" onclick="event.stopPropagation(); AccountsRenderer.suspendAccount('${row.id}')" title="Suspend">Susp</button>` : ''}
      `,
      exportable: true,
    });
  },

  showDetail(id) {
    const acc = S.accounts.list.find(a => a.id === id);
    if (!acc) return;
    S.accounts.selected = acc;
    BO.navigate('account-detail');
  },

  renderDetail() {
    const a = S.accounts.selected;
    if (!a) return BO.navigate('accounts');
    Header.setTitle(a.name, `<a class="breadcrumb-link" onclick="BO.navigate('accounts')">Accounts</a> / ${a.name}`);

    const trades = S.trades.history.filter(t => t.accountId === a.id).slice(0, 20);
    const txns = S.deposits.history.filter(t => t.accountId === a.id).slice(0, 10);

    U.$('#view-account-detail').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="BO.navigate('accounts')">&#8592; Back</button>
        <button class="btn btn-primary" onclick="AccountsRenderer.editAccount('${a.id}')">Edit Account</button>
        <button class="btn btn-secondary" onclick="AccountsRenderer.adjustCredit('${a.id}')">Adjust Credit</button>
        <button class="btn btn-secondary" onclick="AccountsRenderer.adjustBonus('${a.id}')">Adjust Bonus</button>
        ${a.status === 'active' ? `<button class="btn btn-warning" onclick="AccountsRenderer.suspendAccount('${a.id}')">Suspend</button>` : ''}
        ${a.status === 'suspended' ? `<button class="btn btn-success" onclick="AccountsRenderer.activateAccount('${a.id}')">Activate</button>` : ''}
      </div>

      <!-- Account Info Cards -->
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card">
          <div class="kpi-label">Balance</div>
          <div class="kpi-value">${U.money(a.balance)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Equity</div>
          <div class="kpi-value">${U.money(a.equity)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Free Margin</div>
          <div class="kpi-value">${U.money(a.freeMargin)}</div>
        </div>
        <div class="kpi-card ${a.marginLevel < 150 ? 'kpi-danger' : a.marginLevel < 300 ? 'kpi-warning' : ''}">
          <div class="kpi-label">Margin Level</div>
          <div class="kpi-value">${U.pct(a.marginLevel, 0)}</div>
        </div>
      </div>

      <div class="grid-2col">
        <!-- Account Details -->
        <div class="card">
          <div class="card-header"><h3>Account Details</h3></div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-row"><span class="detail-label">ID</span><span>${a.id}</span></div>
              <div class="detail-row"><span class="detail-label">Login</span><span>${a.login}</span></div>
              <div class="detail-row"><span class="detail-label">Email</span><span>${a.email}</span></div>
              <div class="detail-row"><span class="detail-label">Country</span><span>${a.country}</span></div>
              <div class="detail-row"><span class="detail-label">Platform</span><span>${a.platform}</span></div>
              <div class="detail-row"><span class="detail-label">Group</span><span>${a.group}</span></div>
              <div class="detail-row"><span class="detail-label">Status</span><span class="badge ${U.statusClass(a.status)}">${a.status}</span></div>
              <div class="detail-row"><span class="detail-label">Book</span><span class="badge ${a.book === 'a_book' ? 'badge-info' : 'badge-purple'}">${a.book}</span></div>
              <div class="detail-row"><span class="detail-label">Leverage</span><span>1:${a.leverage}</span></div>
              <div class="detail-row"><span class="detail-label">Credit</span><span>${U.money(a.credit)}</span></div>
              <div class="detail-row"><span class="detail-label">Bonus</span><span>${U.money(a.bonus)}</span></div>
              <div class="detail-row"><span class="detail-label">KYC</span><span class="badge ${U.statusClass(a.kycStatus === 'verified' ? 'active' : a.kycStatus)}">${a.kycStatus}</span></div>
              <div class="detail-row"><span class="detail-label">IB</span><span>${a.ibId || 'Direct'}</span></div>
              <div class="detail-row"><span class="detail-label">Risk Score</span><span class="toxicity-badge ${a.riskScore > 70 ? 'tox-high' : a.riskScore > 40 ? 'tox-med' : 'tox-low'}">${a.riskScore}</span></div>
              <div class="detail-row"><span class="detail-label">Toxicity</span><span class="toxicity-badge ${a.toxicity > 70 ? 'tox-high' : a.toxicity > 40 ? 'tox-med' : 'tox-low'}">${a.toxicity}</span></div>
              <div class="detail-row"><span class="detail-label">Open Positions</span><span>${a.openPositions}</span></div>
              <div class="detail-row"><span class="detail-label">Created</span><span>${U.date(a.createdAt)}</span></div>
              <div class="detail-row"><span class="detail-label">Last Login</span><span>${U.datetime(a.lastLogin)}</span></div>
              <div class="detail-row"><span class="detail-label">Last Trade</span><span>${U.datetime(a.lastTrade)}</span></div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-header"><h3>Recent Transactions</h3></div>
          <div class="card-body">
            ${txns.length === 0 ? '<p class="text-muted">No transactions</p>' : `
              <table class="data-table compact">
                <thead><tr><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  ${txns.map(t => `<tr>
                    <td><span class="badge ${t.type === 'deposit' ? 'badge-success' : 'badge-warning'}">${t.type}</span></td>
                    <td>${U.money(t.amount, t.currency)}</td>
                    <td>${t.method}</td>
                    <td><span class="badge ${U.statusClass(t.status)}">${t.status}</span></td>
                    <td>${U.date(t.createdAt)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>

      <!-- Risk Analytics (Probability of Ruin) -->
      ${a.totalTrades ? (() => {
        const routing = RuinEngine.routingRecommendation(a);
        const bd = routing.breakdown;
        return `
      <div class="card">
        <div class="card-header">
          <h3>Risk Analytics — Probability of Ruin</h3>
          <button class="btn btn-sm btn-primary" onclick="RuinRenderer.selectAccount('${a.id}'); BO.navigate('ruin-analysis')">Full Analysis</button>
        </div>
        <div class="card-body">
          <div class="kpi-grid">
            <div class="kpi-card ${routing.por > 0.5 ? 'kpi-danger' : routing.por > 0.2 ? 'kpi-warning' : 'kpi-success'}">
              <div class="kpi-label">Prob. of Ruin</div>
              <div class="kpi-value">${U.pct(routing.por * 100)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Edge / Trade</div>
              <div class="kpi-value ${routing.edge >= 0 ? 'positive' : 'negative'}">${routing.edge >= 0 ? '+' : ''}${U.money(routing.edge)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Kelly %</div>
              <div class="kpi-value">${U.pct(routing.kelly * 100)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Composite Score</div>
              <div class="kpi-value">${U.pct(routing.composite * 100)}</div>
              <div class="kpi-sub"><span class="badge ${routing.recommendation === 'a_book' ? 'badge-info' : routing.recommendation === 'b_book' ? 'badge-purple' : 'badge-warning'}">${routing.recommendation === 'a_book' ? 'A-BOOK' : routing.recommendation === 'b_book' ? 'B-BOOK' : 'REVIEW'}</span></div>
            </div>
          </div>
          <div class="grid-2col" style="margin-top:12px">
            <div>
              <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px">PERFORMANCE</h4>
              <div class="detail-grid">
                <div class="detail-row"><span class="detail-label">Win Rate</span><span>${U.pct(a.winRate * 100)}</span></div>
                <div class="detail-row"><span class="detail-label">Avg Win / Avg Loss</span><span class="positive">${U.money(a.avgWin)}</span> / <span class="negative">${U.money(a.avgLoss)}</span></div>
                <div class="detail-row"><span class="detail-label">R:R Ratio</span><span>${U.num(a.avgWin / a.avgLoss)}</span></div>
                <div class="detail-row"><span class="detail-label">Profit Factor</span><span>${U.num(a.profitFactor)}</span></div>
                <div class="detail-row"><span class="detail-label">Sharpe (ann.)</span><span>${U.num(a.sharpeRatio)}</span></div>
                <div class="detail-row"><span class="detail-label">Max Drawdown</span><span class="negative">${U.pct(a.maxDrawdown * 100)}</span></div>
              </div>
            </div>
            <div>
              <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px">SCORE BREAKDOWN</h4>
              ${['Edge', 'Profit Factor', 'R:R', 'Sharpe', 'Drawdown', 'Volatility', 'Ruin Prob'].map((label, i) => {
                const vals = [bd.edgeScore, bd.pfScore, bd.rrScore, bd.sharpeScore, bd.ddScore, bd.volScore, bd.porScore];
                const v = vals[i];
                return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px">
                  <span style="width:80px;color:var(--text-muted)">${label}</span>
                  <div class="progress-bar" style="flex:1"><div class="progress-fill ${v > 0.6 ? 'fill-danger' : v > 0.3 ? 'fill-warning' : 'fill-success'}" style="width:${v * 100}%"></div></div>
                  <span style="width:35px;text-align:right;font-family:var(--mono)">${U.pct(v * 100, 0)}</span>
                </div>`;
              }).join('')}
              <div style="font-size:10px;color:var(--text-muted);margin-top:6px">Higher score = more skilled/dangerous to warehouse</div>
            </div>
          </div>
        </div>
      </div>`;
      })() : ''}

      <!-- Recent Trades -->
      <div class="card">
        <div class="card-header"><h3>Recent Trades</h3></div>
        <div class="card-body">
          ${trades.length === 0 ? '<p class="text-muted">No trades</p>' : `
            <table class="data-table compact">
              <thead><tr><th>Ticket</th><th>Symbol</th><th>Dir</th><th>Volume</th><th>Open</th><th>Close</th><th>P&L</th><th>Commission</th><th>Swap</th><th>Book</th><th>Time</th></tr></thead>
              <tbody>
                ${trades.map(t => `<tr>
                  <td>${t.ticket}</td>
                  <td>${t.symbol}</td>
                  <td><span class="badge ${t.direction === 'buy' ? 'badge-success' : 'badge-danger'}">${t.direction}</span></td>
                  <td>${U.lots(t.volume)}</td>
                  <td>${t.openPrice}</td>
                  <td>${t.closePrice}</td>
                  <td class="${U.pnlClass(t.pnl)}">${U.pnlSign(t.pnl)}${U.money(t.pnl)}</td>
                  <td>${U.money(t.commission)}</td>
                  <td>${U.money(t.swap)}</td>
                  <td><span class="badge ${t.book === 'a_book' ? 'badge-info' : 'badge-purple'}">${t.book === 'a_book' ? 'A' : 'B'}</span></td>
                  <td>${U.date(t.closeTime)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  },

  openNew() {
    Modal.form('Open New Account', [
      { name: 'name', label: 'Full Name', placeholder: 'John Doe' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
      { name: 'country', label: 'Country', placeholder: 'GB' },
      { name: 'platform', label: 'Platform', type: 'select', options: CONFIG.PLATFORMS.map(p => ({ value: p, label: p })), value: 'MT5' },
      { name: 'group', label: 'Group', type: 'select', options: ['Standard','Premium','VIP','ECN','Pro','Islamic'].map(g => ({ value: g, label: g })), value: 'Standard' },
      { name: 'leverage', label: 'Leverage', type: 'select', options: [100,200,300,500].map(l => ({ value: l, label: '1:' + l })), value: 100 },
      { name: 'book', label: 'Book', type: 'select', options: [{ value: 'b_book', label: 'B-Book' }, { value: 'a_book', label: 'A-Book' }], value: 'b_book' },
    ], (data) => {
      const acc = {
        id: 'ACC' + (10001 + S.accounts.list.length),
        login: 50001 + S.accounts.list.length,
        ...data,
        leverage: parseInt(data.leverage),
        status: 'active',
        balance: 0, equity: 0, credit: 0, bonus: 0, margin: 0, freeMargin: 0, marginLevel: 0,
        openPositions: 0, riskScore: 0, toxicity: 0,
        ibId: null, kycStatus: 'pending',
        createdAt: new Date(), lastLogin: null, lastTrade: null,
      };
      S.accounts.list.unshift(acc);
      Toast.success('Account ' + acc.id + ' created');
      this.render();
    });
  },

  editAccount(id) {
    const acc = S.accounts.list.find(a => a.id === id);
    if (!acc) return;
    Modal.form('Edit Account — ' + acc.name, [
      { name: 'login', label: 'Login', value: acc.login, readonly: true },
      { name: 'group', label: 'Group', type: 'select', options: ['Standard','Premium','VIP','ECN','Pro','Islamic'].map(g => ({ value: g, label: g })), value: acc.group },
      { name: 'leverage', label: 'Leverage', type: 'select', options: [100,200,300,500].map(l => ({ value: String(l), label: '1:' + l })), value: String(acc.leverage) },
      { name: 'book', label: 'Book', type: 'select', options: [{ value: 'b_book', label: 'B-Book' }, { value: 'a_book', label: 'A-Book' }], value: acc.book },
    ], (data) => {
      API.updateAccount(id, { group: data.group, leverage: parseInt(data.leverage), book: data.book });
      Toast.success('Account updated');
      BO.renderCurrentView();
    });
  },

  adjustCredit(id) {
    Modal.form('Adjust Credit', [
      { name: 'amount', label: 'Credit Amount ($)', type: 'number', placeholder: '1000' },
      { name: 'comment', label: 'Comment', type: 'textarea' },
    ], (data) => {
      const acc = S.accounts.list.find(a => a.id === id);
      if (acc) { acc.credit = parseFloat(data.amount) || 0; }
      Toast.success('Credit adjusted');
      BO.renderCurrentView();
    });
  },

  adjustBonus(id) {
    Modal.form('Adjust Bonus', [
      { name: 'amount', label: 'Bonus Amount ($)', type: 'number', placeholder: '500' },
      { name: 'comment', label: 'Comment', type: 'textarea' },
    ], (data) => {
      const acc = S.accounts.list.find(a => a.id === id);
      if (acc) { acc.bonus = parseFloat(data.amount) || 0; }
      Toast.success('Bonus adjusted');
      BO.renderCurrentView();
    });
  },

  suspendAccount(id) {
    Modal.confirm('Suspend Account', 'Are you sure you want to suspend this account?', () => {
      API.updateAccount(id, { status: 'suspended' });
      Toast.warning('Account suspended');
      BO.renderCurrentView();
    });
  },

  activateAccount(id) {
    API.updateAccount(id, { status: 'active' });
    Toast.success('Account activated');
    BO.renderCurrentView();
  },
};

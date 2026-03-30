/**
 * Account Management — list + detail views
 */
const AccountsRenderer = {
  render() {
    Header.setTitle('Client Accounts');
    const view = U.$('#view-accounts');
    const f = S.accounts.filters;

    const actions = C.pageActions([
      { label: '+ New Account', onclick: "AccountsRenderer.openNew()", variant: 'primary' },
    ]);

    view.innerHTML = `
      ${actions}
      ${C.card('', '<div id="accounts-table"></div>')}
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

    const filters = C.filterBar([
      { type: 'search', placeholder: 'Search name/ID/login...', value: f.search, onChange: "S.accounts.filters.search=this.value; AccountsRenderer.render()" },
      { type: 'select', label: 'Status', value: f.status, onChange: "S.accounts.filters.status=this.value; AccountsRenderer.render()", options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'closed', label: 'Closed' },
      ]},
      { type: 'select', label: 'Books', value: f.book, onChange: "S.accounts.filters.book=this.value; AccountsRenderer.render()", options: [
        { value: 'all', label: 'All Books' },
        { value: 'a_book', label: 'A-Book' },
        { value: 'b_book', label: 'B-Book' },
      ]},
    ]);

    Table.render('accounts-table', {
      title: `${filtered.length} Accounts`,
      filters,
      columns: [
        Columns.text('login', 'Login', { width: '70px' }),
        Columns.name('name', 'Name'),
        Columns.badge('status', 'Status'),
        Columns.book('book'),
        Columns.text('group', 'Group'),
        Columns.leverage('leverage'),
        Columns.money('balance', 'Balance'),
        Columns.money('equity', 'Equity'),
        Columns.marginLevel('marginLevel'),
        Columns.toxicity('toxicity'),
        { key: 'openPositions', label: 'Pos', width: '40px', align: 'center' },
      ],
      data: filtered,
      page: S.accounts.page,
      onRowClick: 'AccountsRenderer.showDetail',
      actions: (row) => `
        ${C.actionBtn('Edit', "event.stopPropagation(); AccountsRenderer.editAccount('" + row.id + "')")}
        ${row.status === 'active' ? C.actionBtn('Susp', "event.stopPropagation(); AccountsRenderer.suspendAccount('" + row.id + "')", 'warning') : ''}
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

    // Page actions
    const actionBtns = [
      { label: '\u2190 Back', onclick: "BO.navigate('accounts')", variant: 'secondary' },
      { label: 'Edit Account', onclick: `AccountsRenderer.editAccount('${a.id}')`, variant: 'primary' },
      { label: 'Adjust Credit', onclick: `AccountsRenderer.adjustCredit('${a.id}')`, variant: 'secondary' },
      { label: 'Adjust Bonus', onclick: `AccountsRenderer.adjustBonus('${a.id}')`, variant: 'secondary' },
    ];
    if (a.status === 'active') actionBtns.push({ label: 'Suspend', onclick: `AccountsRenderer.suspendAccount('${a.id}')`, variant: 'warning' });
    if (a.status === 'suspended') actionBtns.push({ label: 'Activate', onclick: `AccountsRenderer.activateAccount('${a.id}')`, variant: 'success' });

    // KPI row
    const kpis = C.kpiGrid([
      C.kpi('Balance', U.money(a.balance)),
      C.kpi('Equity', U.money(a.equity)),
      C.kpi('Free Margin', U.money(a.freeMargin)),
      C.kpi('Margin Level', U.pct(a.marginLevel, 0), undefined,
        { variant: a.marginLevel < 150 ? 'danger' : a.marginLevel < 300 ? 'warning' : undefined }),
    ], 4);

    // Account details card
    const detailCard = C.card('Account Details', C.detailGrid([
      { label: 'ID', value: a.id },
      { label: 'Login', value: a.login },
      { label: 'Email', value: a.email },
      { label: 'Country', value: a.country },
      { label: 'Platform', value: a.platform },
      { label: 'Group', value: a.group },
      { label: 'Status', html: C.badge(a.status) },
      { label: 'Book', html: C.bookBadge(a.book) },
      { label: 'Leverage', value: '1:' + a.leverage },
      { label: 'Credit', value: U.money(a.credit) },
      { label: 'Bonus', value: U.money(a.bonus) },
      { label: 'KYC', html: C.badge(a.kycStatus === 'verified' ? 'active' : a.kycStatus) },
      { label: 'IB', value: a.ibId || 'Direct' },
      { label: 'Risk Score', html: C.toxBadge(a.riskScore) },
      { label: 'Toxicity', html: C.toxBadge(a.toxicity) },
      { label: 'Open Positions', value: a.openPositions },
      { label: 'Created', value: U.date(a.createdAt) },
      { label: 'Last Login', value: U.datetime(a.lastLogin) },
      { label: 'Last Trade', value: U.datetime(a.lastTrade) },
    ]));

    // Recent transactions card
    const txnBody = txns.length === 0
      ? C.emptyState('No transactions')
      : C.simpleTable(
          ['Type', 'Amount', 'Method', 'Status', 'Date'],
          txns.map(t => `<tr>
            <td>${C.badge(t.type, t.type === 'deposit' ? 'success' : 'warning')}</td>
            <td>${U.money(t.amount, t.currency)}</td>
            <td>${U.escape(t.method)}</td>
            <td>${C.badge(t.status)}</td>
            <td>${U.date(t.createdAt)}</td>
          </tr>`),
          { compact: true }
        );
    const txnCard = C.card('Recent Transactions', txnBody);

    // Risk Analytics section
    let riskSection = '';
    if (a.totalTrades) {
      const routing = RuinEngine.routingRecommendation(a);
      const bd = routing.breakdown;

      const recBadgeCls = routing.recommendation === 'a_book' ? 'badge-info' : routing.recommendation === 'b_book' ? 'badge-purple' : 'badge-warning';
      const recLabel = routing.recommendation === 'a_book' ? 'A-BOOK' : routing.recommendation === 'b_book' ? 'B-BOOK' : 'REVIEW';

      const riskKpis = C.kpiGrid([
        C.kpi('Prob. of Ruin', U.pct(routing.por * 100), undefined,
          { variant: routing.por > 0.5 ? 'danger' : routing.por > 0.2 ? 'warning' : 'success' }),
        C.kpi('Edge / Trade',
          `<span class="${U.pnlClass(routing.edge)}">${routing.edge >= 0 ? '+' : ''}${U.money(routing.edge)}</span>`),
        C.kpi('Kelly %', U.pct(routing.kelly * 100)),
        C.kpi('Composite Score', U.pct(routing.composite * 100),
          `<span class="badge ${recBadgeCls}">${recLabel}</span>`),
      ]);

      const perfGrid = C.detailGrid([
        { label: 'Win Rate', value: U.pct(a.winRate * 100) },
        { label: 'Avg Win / Avg Loss', html: `<span class="positive">${U.money(a.avgWin)}</span> / <span class="negative">${U.money(a.avgLoss)}</span>` },
        { label: 'R:R Ratio', value: U.num(a.avgWin / a.avgLoss) },
        { label: 'Profit Factor', value: U.num(a.profitFactor) },
        { label: 'Sharpe (ann.)', value: U.num(a.sharpeRatio) },
        { label: 'Max Drawdown', html: `<span class="negative">${U.pct(a.maxDrawdown * 100)}</span>` },
      ]);

      const scoreLabels = ['Edge', 'Profit Factor', 'R:R', 'Sharpe', 'Drawdown', 'Volatility', 'Ruin Prob'];
      const scoreVals = [bd.edgeScore, bd.pfScore, bd.rrScore, bd.sharpeScore, bd.ddScore, bd.volScore, bd.porScore];
      const scoreBreakdown = scoreLabels.map((label, i) => {
        const v = scoreVals[i];
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px">
          <span style="width:80px;color:var(--text-muted)">${label}</span>
          ${C.progressBar(v * 100)}
          <span style="width:35px;text-align:right;font-family:var(--mono)">${U.pct(v * 100, 0)}</span>
        </div>`;
      }).join('');

      const riskBody = `
        ${riskKpis}
        <div class="grid-2col" style="margin-top:12px">
          <div>
            ${C.sectionLabel('PERFORMANCE')}
            ${perfGrid}
          </div>
          <div>
            ${C.sectionLabel('SCORE BREAKDOWN')}
            ${scoreBreakdown}
            <div style="font-size:10px;color:var(--text-muted);margin-top:6px">Higher score = more skilled/dangerous to warehouse</div>
          </div>
        </div>
      `;

      riskSection = C.card('Risk Analytics \u2014 Probability of Ruin', riskBody, {
        actions: `<button class="btn btn-sm btn-primary" onclick="RuinRenderer.selectAccount('${a.id}'); BO.navigate('ruin-analysis')">Full Analysis</button>`,
      });
    }

    // Recent trades card
    const tradesBody = trades.length === 0
      ? C.emptyState('No trades')
      : C.simpleTable(
          ['Ticket', 'Symbol', 'Dir', 'Volume', 'Open', 'Close', 'P&L', 'Commission', 'Swap', 'Book', 'Time'],
          trades.map(t => `<tr>
            <td>${U.escape(t.ticket)}</td>
            <td>${U.escape(t.symbol)}</td>
            <td>${C.dirBadge(t.direction)}</td>
            <td>${U.lots(t.volume)}</td>
            <td>${t.openPrice}</td>
            <td>${t.closePrice}</td>
            <td>${C.pnl(t.pnl)}</td>
            <td>${U.money(t.commission)}</td>
            <td>${U.money(t.swap)}</td>
            <td>${C.bookBadge(t.book)}</td>
            <td>${U.date(t.closeTime)}</td>
          </tr>`),
          { compact: true }
        );
    const tradesCard = C.card('Recent Trades', tradesBody);

    U.$('#view-account-detail').innerHTML = `
      ${C.pageActions(actionBtns)}
      ${kpis}
      ${C.grid2(detailCard, txnCard)}
      ${riskSection}
      ${tradesCard}
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
    Modal.form('Edit Account \u2014 ' + acc.name, [
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

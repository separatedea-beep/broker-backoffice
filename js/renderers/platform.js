/**
 * Platform Management — symbols, leverage groups, trading hours, server health
 */
const PlatformRenderer = {
  renderSymbols() {
    Header.setTitle('Symbols');
    const symbols = S.platform.symbols;

    const actions = C.pageActions([
      { label: '+ Add Symbol', onclick: 'PlatformRenderer.addSymbol()', variant: 'primary' },
    ]);

    const headers = ['Symbol', 'Type', 'Enabled', 'Contract', 'Digits', 'Spread', 'Min Lot', 'Max Lot', 'Swap Long', 'Swap Short', 'Margin %', 'Sessions', 'Actions'];
    const rows = symbols.map(s => `<tr>
      <td><strong>${U.escape(s.symbol)}</strong></td>
      <td>${C.badge(s.type, 'default')}</td>
      <td>${s.enabled ? C.badge('Yes', 'success') : C.badge('No', 'danger')}</td>
      <td>${s.contractSize.toLocaleString()}</td>
      <td>${s.digits}</td>
      <td>${U.num(s.avgSpread)}</td>
      <td>${s.minLot}</td>
      <td>${s.maxLot}</td>
      <td class="${s.swapLong < 0 ? 'negative' : 'positive'}">${U.num(s.swapLong)}</td>
      <td class="${s.swapShort < 0 ? 'negative' : 'positive'}">${U.num(s.swapShort)}</td>
      <td>${U.pct(s.marginRate)}</td>
      <td class="text-sm">${U.escape(s.sessions)}</td>
      <td>${C.actionBtn('Edit', `PlatformRenderer.editSymbol('${s.symbol}')`, 'secondary')} ${C.actionBtn(s.enabled ? 'Disable' : 'Enable', `PlatformRenderer.toggleSymbol('${s.symbol}')`, s.enabled ? 'warning' : 'success')}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows, { compact: true }));

    U.$('#view-symbols').innerHTML = `${actions}${table}`;
  },

  editSymbol(symbol) {
    const s = S.platform.symbols.find(x => x.symbol === symbol);
    if (!s) return;
    Modal.form('Edit Symbol — ' + symbol, [
      { name: 'avgSpread', label: 'Avg Spread', type: 'number', value: s.avgSpread },
      { name: 'minLot', label: 'Min Lot', type: 'number', value: s.minLot },
      { name: 'maxLot', label: 'Max Lot', type: 'number', value: s.maxLot },
      { name: 'swapLong', label: 'Swap Long', type: 'number', value: s.swapLong },
      { name: 'swapShort', label: 'Swap Short', type: 'number', value: s.swapShort },
      { name: 'marginRate', label: 'Margin Rate %', type: 'number', value: s.marginRate },
    ], (data) => {
      Object.assign(s, { avgSpread: parseFloat(data.avgSpread), minLot: parseFloat(data.minLot), maxLot: parseFloat(data.maxLot), swapLong: parseFloat(data.swapLong), swapShort: parseFloat(data.swapShort), marginRate: parseFloat(data.marginRate) });
      Toast.success('Symbol updated');
      BO.renderCurrentView();
    });
  },

  toggleSymbol(symbol) {
    const s = S.platform.symbols.find(x => x.symbol === symbol);
    if (s) s.enabled = !s.enabled;
    Toast.info(`${symbol} ${s.enabled ? 'enabled' : 'disabled'}`);
    BO.renderCurrentView();
  },

  addSymbol() {
    Modal.form('Add Symbol', [
      { name: 'symbol', label: 'Symbol', placeholder: 'EURCHF' },
      { name: 'type', label: 'Type', type: 'select', options: ['Forex','Index','Metal','Energy','Crypto'].map(v => ({ value: v, label: v })) },
      { name: 'contractSize', label: 'Contract Size', type: 'number', value: 100000 },
      { name: 'digits', label: 'Digits', type: 'number', value: 5 },
      { name: 'marginRate', label: 'Margin Rate %', type: 'number', value: 1 },
    ], (data) => {
      S.platform.symbols.push({ symbol: data.symbol, description: data.symbol, type: data.type, enabled: true, contractSize: parseInt(data.contractSize), digits: parseInt(data.digits), spreadType: 'floating', avgSpread: 1.5, minLot: 0.01, maxLot: 100, lotStep: 0.01, swapLong: 0, swapShort: 0, swapType: 'points', tripleSwapDay: 3, marginRate: parseFloat(data.marginRate), sessions: 'Mon 00:00 - Fri 23:59' });
      Toast.success('Symbol added');
      BO.renderCurrentView();
    });
  },

  // Leverage Groups
  renderLeverage() {
    Header.setTitle('Leverage Groups');
    const groups = S.platform.leverageGroups;

    const headers = ['Group', 'Default Leverage', 'Max Exposure', 'Accounts', 'Overrides', 'Actions'];
    const rows = groups.map(g => `<tr>
      <td><strong>${U.escape(g.name)}</strong></td>
      <td>1:${g.defaultLeverage}</td>
      <td>${U.money(g.maxExposure)}</td>
      <td>${g.accounts}</td>
      <td>${g.overrides.length > 0 ? g.overrides.map(o => `${U.escape(o.symbol)}: 1:${o.leverage}`).join(', ') : 'None'}</td>
      <td>${C.actionBtn('Edit', `PlatformRenderer.editLeverage('${g.name}')`, 'secondary')}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-leverage').innerHTML = table;
  },

  editLeverage(name) {
    const g = S.platform.leverageGroups.find(x => x.name === name);
    if (!g) return;
    Modal.form('Edit Leverage Group — ' + name, [
      { name: 'defaultLeverage', label: 'Default Leverage', type: 'select', options: [50,100,200,300,500,1000].map(l => ({ value: String(l), label: '1:' + l })), value: String(g.defaultLeverage) },
      { name: 'maxExposure', label: 'Max Exposure ($)', type: 'number', value: g.maxExposure },
    ], (data) => {
      g.defaultLeverage = parseInt(data.defaultLeverage);
      g.maxExposure = parseFloat(data.maxExposure);
      Toast.success('Leverage group updated');
      BO.renderCurrentView();
    });
  },

  // Trading Hours
  renderTradingHours() {
    Header.setTitle('Trading Hours');
    const symbols = S.platform.symbols;

    const headers = ['Symbol', 'Type', 'Trading Hours', 'Actions'];
    const rows = symbols.map(s => `<tr>
      <td><strong>${U.escape(s.symbol)}</strong></td>
      <td>${U.escape(s.type)}</td>
      <td>${U.escape(s.sessions)}</td>
      <td>${C.actionBtn('Edit', `PlatformRenderer.editHours('${s.symbol}')`, 'secondary')}</td>
    </tr>`);

    const table = C.card('Market Sessions', C.simpleTable(headers, rows, { compact: true }));

    U.$('#view-trading-hours').innerHTML = table;
  },

  editHours(symbol) {
    const s = S.platform.symbols.find(x => x.symbol === symbol);
    if (!s) return;
    Modal.form('Edit Trading Hours — ' + symbol, [
      { name: 'sessions', label: 'Trading Hours', value: s.sessions, placeholder: 'Mon 00:00 - Fri 23:59' },
    ], (data) => {
      s.sessions = data.sessions;
      Toast.success('Trading hours updated for ' + symbol);
      BO.renderCurrentView();
    });
  },

  // Server Health
  renderServerHealth() {
    Header.setTitle('Server Health');
    const servers = S.platform.serverHealth;

    U.$('#view-server-health').innerHTML = `<div class="server-grid">
      ${servers.map(s => C.serverCard(s)).join('')}
    </div>`;
  },
};

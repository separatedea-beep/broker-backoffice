/**
 * Platform Management — symbols, leverage groups, trading hours, server health
 */
const PlatformRenderer = {
  renderSymbols() {
    Header.setTitle('Symbols');
    const symbols = S.platform.symbols;

    U.$('#view-symbols').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="PlatformRenderer.addSymbol()">+ Add Symbol</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Symbol</th><th>Type</th><th>Enabled</th><th>Contract</th><th>Digits</th><th>Spread</th><th>Min Lot</th><th>Max Lot</th><th>Swap Long</th><th>Swap Short</th><th>Margin %</th><th>Sessions</th><th>Actions</th></tr></thead>
            <tbody>
              ${symbols.map(s => `<tr>
                <td><strong>${s.symbol}</strong></td>
                <td><span class="badge badge-default">${s.type}</span></td>
                <td>${s.enabled ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td>
                <td>${s.contractSize.toLocaleString()}</td>
                <td>${s.digits}</td>
                <td>${U.num(s.avgSpread)}</td>
                <td>${s.minLot}</td>
                <td>${s.maxLot}</td>
                <td class="${s.swapLong < 0 ? 'negative' : 'positive'}">${U.num(s.swapLong)}</td>
                <td class="${s.swapShort < 0 ? 'negative' : 'positive'}">${U.num(s.swapShort)}</td>
                <td>${U.pct(s.marginRate)}</td>
                <td class="text-sm">${s.sessions}</td>
                <td>
                  <button class="btn btn-xs btn-secondary" onclick="PlatformRenderer.editSymbol('${s.symbol}')">Edit</button>
                  <button class="btn btn-xs ${s.enabled ? 'btn-warning' : 'btn-success'}" onclick="PlatformRenderer.toggleSymbol('${s.symbol}')">${s.enabled ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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

    U.$('#view-leverage').innerHTML = `
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Group</th><th>Default Leverage</th><th>Max Exposure</th><th>Accounts</th><th>Overrides</th><th>Actions</th></tr></thead>
            <tbody>
              ${groups.map(g => `<tr>
                <td><strong>${g.name}</strong></td>
                <td>1:${g.defaultLeverage}</td>
                <td>${U.money(g.maxExposure)}</td>
                <td>${g.accounts}</td>
                <td>${g.overrides.length > 0 ? g.overrides.map(o => `${o.symbol}: 1:${o.leverage}`).join(', ') : 'None'}</td>
                <td><button class="btn btn-xs btn-secondary" onclick="PlatformRenderer.editLeverage('${g.name}')">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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

    U.$('#view-trading-hours').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Market Sessions</h3></div>
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Symbol</th><th>Type</th><th>Trading Hours</th><th>Actions</th></tr></thead>
            <tbody>
              ${symbols.map(s => `<tr>
                <td><strong>${s.symbol}</strong></td>
                <td>${s.type}</td>
                <td>${s.sessions}</td>
                <td><button class="btn btn-xs btn-secondary" onclick="PlatformRenderer.editHours('${s.symbol}')">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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

    U.$('#view-server-health').innerHTML = `
      <div class="server-grid">
        ${servers.map(s => `
          <div class="server-card ${s.status}">
            <div class="server-header">
              <span class="status-dot dot-${s.status === 'healthy' ? 'green' : s.status === 'warning' ? 'yellow' : 'red'}"></span>
              <strong>${s.name}</strong>
              <span class="text-sm">${s.status}</span>
            </div>
            <div class="server-metrics">
              <div class="server-metric">
                <span class="metric-label">CPU</span>
                <div class="progress-bar"><div class="progress-fill ${s.cpu > 80 ? 'fill-danger' : s.cpu > 60 ? 'fill-warning' : 'fill-success'}" style="width:${s.cpu}%"></div></div>
                <span class="metric-value">${U.pct(s.cpu, 0)}</span>
              </div>
              <div class="server-metric">
                <span class="metric-label">Memory</span>
                <div class="progress-bar"><div class="progress-fill ${s.memory > 80 ? 'fill-danger' : s.memory > 60 ? 'fill-warning' : 'fill-success'}" style="width:${s.memory}%"></div></div>
                <span class="metric-value">${U.pct(s.memory, 0)}</span>
              </div>
              <div class="server-metric">
                <span class="metric-label">Disk</span>
                <div class="progress-bar"><div class="progress-fill ${s.disk > 80 ? 'fill-danger' : s.disk > 60 ? 'fill-warning' : 'fill-success'}" style="width:${s.disk}%"></div></div>
                <span class="metric-value">${U.pct(s.disk, 0)}</span>
              </div>
            </div>
            <div class="server-footer">
              <span>Connections: ${s.connections}</span>
              <span>Uptime: ${s.uptime}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },
};

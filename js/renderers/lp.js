/**
 * LP Management — overview, margin top-ups, session health
 */
const LPRenderer = {
  renderOverview() {
    Header.setTitle('LP Overview');
    const lps = S.lp.providers;

    U.$('#view-lp-overview').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Active LPs</div><div class="kpi-value">${lps.filter(l => l.status === 'connected').length} / ${lps.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Credit Line</div><div class="kpi-value">${U.money(lps.reduce((s,l) => s + l.creditLine, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Margin Used</div><div class="kpi-value">${U.money(lps.reduce((s,l) => s + l.marginUsed, 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Latency</div><div class="kpi-value">${U.num(lps.reduce((s,l) => s + l.avgLatency, 0) / lps.length, 0)}ms</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Fill Rate</div><div class="kpi-value">${U.pct(lps.reduce((s,l) => s + l.fillRate, 0) / lps.length)}</div></div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>LP</th><th>Status</th><th>Protocol</th><th>Credit Line</th><th>Margin Used</th><th>Utilisation</th><th>Latency</th><th>Rejection %</th><th>Fill Rate</th><th>Uptime</th><th>Daily Volume</th><th>Last HB</th></tr></thead>
            <tbody>
              ${lps.map(lp => `<tr>
                <td><strong>${lp.name}</strong></td>
                <td><span class="badge ${U.statusClass(lp.status)}">${lp.status}</span></td>
                <td>${lp.protocol}</td>
                <td class="text-right">${U.money(lp.creditLine)}</td>
                <td class="text-right">${U.money(lp.marginUsed)}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill ${lp.utilisation > 85 ? 'fill-danger' : lp.utilisation > 70 ? 'fill-warning' : 'fill-success'}" style="width:${lp.utilisation}%"></div>
                  </div>
                  <span class="text-sm">${U.pct(lp.utilisation)}</span>
                </td>
                <td class="${lp.avgLatency > CONFIG.THRESHOLDS.LATENCY_CRITICAL ? 'text-danger' : lp.avgLatency > CONFIG.THRESHOLDS.LATENCY_WARNING ? 'text-warning' : ''}">${U.num(lp.avgLatency, 0)}ms</td>
                <td class="${lp.rejectionRate > 3 ? 'text-warning' : ''}">${U.pct(lp.rejectionRate)}</td>
                <td>${U.pct(lp.fillRate)}</td>
                <td>${U.pct(lp.uptime)}</td>
                <td class="text-right">${U.money(lp.dailyVolume)}</td>
                <td>${U.ago(lp.lastHeartbeat)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderMargin() {
    Header.setTitle('Margin Top-Ups');
    const topups = S.lp.marginTopups;

    U.$('#view-lp-margin').innerHTML = `
      <div class="page-actions">
        <button class="btn btn-primary" onclick="LPRenderer.requestTopup()">+ Request Top-Up</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>ID</th><th>LP</th><th>Amount</th><th>Currency</th><th>Status</th><th>Requested At</th><th>Requested By</th><th>Approved By</th><th>Actions</th></tr></thead>
            <tbody>
              ${topups.map(t => `<tr>
                <td>${t.id}</td>
                <td><strong>${t.lpName}</strong></td>
                <td class="text-right">${U.money(t.amount, t.currency)}</td>
                <td>${t.currency}</td>
                <td><span class="badge ${U.statusClass(t.status)}">${t.status}</span></td>
                <td>${U.datetime(t.requestedAt)}</td>
                <td>${t.requestedBy}</td>
                <td>${t.approvedBy || '-'}</td>
                <td>${t.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="LPRenderer.approveTopup('${t.id}')">Approve</button>` : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  requestTopup() {
    Modal.form('Request Margin Top-Up', [
      { name: 'lpId', label: 'LP', type: 'select', options: S.lp.providers.map(l => ({ value: l.id, label: l.name })) },
      { name: 'amount', label: 'Amount', type: 'number', placeholder: '100000' },
      { name: 'currency', label: 'Currency', type: 'select', options: ['USD','EUR','GBP'].map(c => ({ value: c, label: c })), value: 'USD' },
    ], (data) => {
      const lp = S.lp.providers.find(l => l.id === data.lpId);
      S.lp.marginTopups.push({ id: 'MT' + U.uid(), lpId: data.lpId, lpName: lp?.name || data.lpId, amount: parseFloat(data.amount), currency: data.currency, status: 'pending', requestedAt: new Date(), requestedBy: 'Admin', approvedBy: null });
      Toast.success('Top-up request created');
      this.renderMargin();
    });
  },

  approveTopup(id) {
    const t = S.lp.marginTopups.find(x => x.id === id);
    if (t) { t.status = 'funded'; t.approvedBy = 'Admin'; }
    Toast.success('Top-up approved');
    this.renderMargin();
  },

  renderSessions() {
    Header.setTitle('Session Health');
    const sessions = S.lp.sessions.sort((a, b) => b.timestamp - a.timestamp);

    U.$('#view-lp-sessions').innerHTML = `
      <!-- LP Status Cards -->
      <div class="lp-status-grid">
        ${S.lp.providers.map(lp => `
          <div class="lp-status-card ${lp.status}">
            <div class="lp-status-header">
              <span class="status-dot dot-${lp.status === 'connected' ? 'green' : lp.status === 'degraded' ? 'yellow' : 'red'}"></span>
              <strong>${lp.name}</strong>
            </div>
            <div class="lp-status-body">
              <div>Latency: <span class="${lp.avgLatency > CONFIG.THRESHOLDS.LATENCY_WARNING ? 'text-warning' : ''}">${U.num(lp.avgLatency, 0)}ms</span></div>
              <div>Uptime: ${U.pct(lp.uptime)}</div>
              <div>Session: ${U.ago(lp.sessionStart)}</div>
              <div>Last HB: ${U.ago(lp.lastHeartbeat)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Session Log -->
      <div class="card">
        <div class="card-header"><h3>Session Event Log</h3></div>
        <div class="card-body">
          <table class="data-table compact">
            <thead><tr><th>Time</th><th>LP</th><th>Event</th><th>Latency</th></tr></thead>
            <tbody>
              ${sessions.slice(0, 50).map(s => `<tr>
                <td>${U.datetime(s.timestamp)}</td>
                <td>${s.lpName}</td>
                <td><span class="badge ${s.event === 'error' || s.event === 'latency_spike' ? 'badge-danger' : s.event === 'reconnect' ? 'badge-warning' : 'badge-default'}">${s.event}</span></td>
                <td class="${s.latency > CONFIG.THRESHOLDS.LATENCY_WARNING ? 'text-warning' : ''}">${U.num(s.latency, 0)}ms</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
};

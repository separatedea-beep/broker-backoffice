/**
 * LP Management — overview, margin top-ups, session health
 */
const LPRenderer = {
  renderOverview() {
    Header.setTitle('LP Overview');
    const lps = S.lp.providers;

    const kpis = C.kpiGrid([
      C.kpi('Active LPs', `${lps.filter(l => l.status === 'connected').length} / ${lps.length}`),
      C.kpi('Total Credit Line', U.money(lps.reduce((s, l) => s + l.creditLine, 0))),
      C.kpi('Total Margin Used', U.money(lps.reduce((s, l) => s + l.marginUsed, 0))),
      C.kpi('Avg Latency', `${U.num(lps.reduce((s, l) => s + l.avgLatency, 0) / lps.length, 0)}ms`),
      C.kpi('Avg Fill Rate', U.pct(lps.reduce((s, l) => s + l.fillRate, 0) / lps.length)),
    ]);

    const headers = ['LP', 'Status', 'Protocol', 'Credit Line', 'Margin Used', 'Utilisation', 'Latency', 'Rejection %', 'Fill Rate', 'Uptime', 'Daily Volume', 'Last HB'];
    const rows = lps.map(lp => `<tr>
      <td><strong>${U.escape(lp.name)}</strong></td>
      <td>${C.badge(lp.status)}</td>
      <td>${U.escape(lp.protocol)}</td>
      <td class="text-right">${U.money(lp.creditLine)}</td>
      <td class="text-right">${U.money(lp.marginUsed)}</td>
      <td>${C.progressBar(lp.utilisation, 100)}<span class="text-sm">${U.pct(lp.utilisation)}</span></td>
      <td>${C.latency(lp.avgLatency)}</td>
      <td class="${lp.rejectionRate > 3 ? 'text-warning' : ''}">${U.pct(lp.rejectionRate)}</td>
      <td>${U.pct(lp.fillRate)}</td>
      <td>${U.pct(lp.uptime)}</td>
      <td class="text-right">${U.money(lp.dailyVolume)}</td>
      <td>${U.ago(lp.lastHeartbeat)}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-lp-overview').innerHTML = `${kpis}${table}`;
  },

  renderMargin() {
    Header.setTitle('Margin Top-Ups');
    const topups = S.lp.marginTopups;

    const actions = C.pageActions([
      { label: '+ Request Top-Up', onclick: 'LPRenderer.requestTopup()', variant: 'primary' },
    ]);

    const headers = ['ID', 'LP', 'Amount', 'Currency', 'Status', 'Requested At', 'Requested By', 'Approved By', 'Actions'];
    const rows = topups.map(t => `<tr>
      <td>${U.escape(t.id)}</td>
      <td><strong>${U.escape(t.lpName)}</strong></td>
      <td class="text-right">${U.money(t.amount, t.currency)}</td>
      <td>${U.escape(t.currency)}</td>
      <td>${C.badge(t.status)}</td>
      <td>${U.datetime(t.requestedAt)}</td>
      <td>${U.escape(t.requestedBy)}</td>
      <td>${t.approvedBy ? U.escape(t.approvedBy) : '-'}</td>
      <td>${t.status === 'pending' ? C.actionBtn('Approve', `LPRenderer.approveTopup('${t.id}')`, 'success') : '-'}</td>
    </tr>`);

    const table = C.card('', C.simpleTable(headers, rows));

    U.$('#view-lp-margin').innerHTML = `${actions}${table}`;
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

    const statusCards = `<div class="lp-status-grid">
      ${S.lp.providers.map(lp => C.lpStatusCard(lp)).join('')}
    </div>`;

    const headers = ['Time', 'LP', 'Event', 'Latency'];
    const rows = sessions.slice(0, 50).map(s => `<tr>
      <td>${U.datetime(s.timestamp)}</td>
      <td>${U.escape(s.lpName)}</td>
      <td>${C.badge(s.event, s.event === 'error' || s.event === 'latency_spike' ? 'danger' : s.event === 'reconnect' ? 'warning' : 'default')}</td>
      <td>${C.latency(s.latency)}</td>
    </tr>`);

    const logCard = C.card('Session Event Log', C.simpleTable(headers, rows, { compact: true }));

    U.$('#view-lp-sessions').innerHTML = `${statusCards}${logCard}`;
  },
};

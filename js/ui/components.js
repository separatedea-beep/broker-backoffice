/**
 * Component Library — reusable HTML-returning render functions.
 *
 * Every function returns an HTML string. Renderers compose views by
 * concatenating component outputs. No DOM manipulation here — just markup.
 *
 * Usage:  C.kpi('Balance', U.money(val))
 *         C.card('Title', innerHtml, { actions: '<button>...</button>' })
 */
const C = {

  // ── KPI Cards ────────────────────────────────────────────────

  /** Single KPI card. opts: { variant, cls, valueClass } */
  kpi(label, value, subtitle, opts = {}) {
    const cls = opts.variant ? `kpi-card kpi-${opts.variant}` : 'kpi-card';
    const extra = opts.cls ? ' ' + opts.cls : '';
    const valCls = opts.valueClass ? ' ' + opts.valueClass : '';
    return `<div class="${cls}${extra}">
      <div class="kpi-label">${U.escape(label)}</div>
      <div class="kpi-value${valCls}">${value}</div>
      ${subtitle ? `<div class="kpi-sub">${subtitle}</div>` : ''}
    </div>`;
  },

  /** KPI card with auto P&L coloring */
  kpiPnl(label, value, subtitle) {
    return this.kpi(label, `${U.pnlSign(value)}${U.money(value)}`, subtitle, { valueClass: U.pnlClass(value) });
  },

  /** Grid of KPI cards. cols: 4 | 'auto' (default auto-fit) */
  kpiGrid(cards, cols) {
    const cls = cols ? `kpi-grid kpi-grid-${cols}` : 'kpi-grid';
    return `<div class="${cls}">${cards.join('')}</div>`;
  },

  // ── Cards ────────────────────────────────────────────────────

  /** Card wrapper. opts: { actions, filters, headerRight, id } */
  card(title, body, opts = {}) {
    const header = title || opts.actions || opts.filters || opts.headerRight
      ? `<div class="card-header">
          ${title ? `<h3>${title}</h3>` : ''}
          ${opts.actions || ''}
          ${opts.filters ? `<div class="card-filters">${opts.filters}</div>` : ''}
          ${opts.headerRight || ''}
        </div>` : '';
    return `<div class="card" ${opts.id ? `id="${opts.id}"` : ''}>${header}<div class="card-body">${body}</div></div>`;
  },

  /** Card with just a body, no header */
  cardBody(body) {
    return `<div class="card"><div class="card-body">${body}</div></div>`;
  },

  // ── Badges ───────────────────────────────────────────────────

  /** Universal badge. type: 'status' (auto), 'success', 'warning', 'danger', 'info', 'purple', 'default' */
  badge(text, type = 'status') {
    const cls = type === 'status' ? U.statusClass(text) : `badge-${type}`;
    return `<span class="badge ${cls}">${U.escape(String(text))}</span>`;
  },

  /** A/B book badge */
  bookBadge(book) {
    const isA = book === 'a_book';
    return `<span class="badge ${isA ? 'badge-info' : 'badge-purple'}">${isA ? 'A' : 'B'}</span>`;
  },

  /** Buy/Sell direction badge */
  dirBadge(dir) {
    return `<span class="badge ${dir === 'buy' ? 'badge-success' : 'badge-danger'}">${dir}</span>`;
  },

  /** Toxicity score badge */
  toxBadge(score) {
    const cls = score > 70 ? 'tox-high' : score > 40 ? 'tox-med' : 'tox-low';
    return `<span class="toxicity-badge ${cls}">${score}</span>`;
  },

  /** Probability of Ruin badge (inverted: low = dangerous) */
  porBadge(por) {
    const cls = por > 0.6 ? 'tox-low' : por > 0.2 ? 'tox-med' : 'tox-high';
    return `<span class="toxicity-badge ${cls}">${U.pct(por * 100, 0)}</span>`;
  },

  /** Priority badge */
  priorityBadge(p) {
    const cls = p === 'high' ? 'badge-danger' : p === 'medium' ? 'badge-warning' : 'badge-info';
    return `<span class="badge ${cls}">${p}</span>`;
  },

  /** Impact badge */
  impactBadge(i) {
    const cls = i === 'high' ? 'badge-danger' : i === 'medium' ? 'badge-warning' : 'badge-info';
    return `<span class="badge ${cls}">${i}</span>`;
  },

  // ── Formatted Values ─────────────────────────────────────────

  /** P&L value with sign and color */
  pnl(value) {
    return `<span class="${U.pnlClass(value)}">${U.pnlSign(value)}${U.money(value)}</span>`;
  },

  /** Bold P&L */
  pnlBold(value) {
    return `<span class="${U.pnlClass(value)}"><strong>${U.pnlSign(value)}${U.money(value)}</strong></span>`;
  },

  /** Margin level with threshold coloring */
  marginLevel(level) {
    const cls = level < CONFIG.THRESHOLDS.MARGIN_LEVEL_DANGER ? 'text-danger'
              : level < CONFIG.THRESHOLDS.MARGIN_LEVEL_WARNING ? 'text-warning' : '';
    return `<span class="${cls}">${U.pct(level, 0)}</span>`;
  },

  /** Latency value with warning threshold */
  latency(ms) {
    const cls = ms > CONFIG.THRESHOLDS.LATENCY_CRITICAL ? 'text-danger'
              : ms > CONFIG.THRESHOLDS.LATENCY_WARNING ? 'text-warning' : '';
    return `<span class="${cls}">${U.num(ms, 0)}ms</span>`;
  },

  /** Slippage value with warning */
  slippage(pips) {
    const cls = Math.abs(pips) > CONFIG.THRESHOLDS.SLIPPAGE_WARNING ? 'text-warning' : '';
    return `<span class="${cls}">${U.pips(pips)}</span>`;
  },

  // ── Detail Grids ─────────────────────────────────────────────

  /** Detail grid from array of { label, value } or { label, html } */
  detailGrid(rows) {
    return `<div class="detail-grid">${rows.map(r =>
      `<div class="detail-row"><span class="detail-label">${U.escape(r.label)}</span><span>${r.html || U.escape(String(r.value ?? '-'))}</span></div>`
    ).join('')}</div>`;
  },

  // ── Progress Bar ─────────────────────────────────────────────

  /** Progress bar. Auto-colors based on value/max ratio. */
  progressBar(value, max = 100) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const variant = pct > CONFIG.THRESHOLDS.EXPOSURE_CRITICAL ? 'fill-danger'
                  : pct > CONFIG.THRESHOLDS.EXPOSURE_WARNING ? 'fill-warning' : 'fill-success';
    return `<div class="progress-bar"><div class="progress-fill ${variant}" style="width:${pct}%"></div></div>`;
  },

  /** Progress bar with label */
  progressWithLabel(label, value, max = 100) {
    return `<div class="server-metric">
      <span class="metric-label">${label}</span>
      ${this.progressBar(value, max)}
      <span class="metric-value">${U.pct(value, 0)}</span>
    </div>`;
  },

  // ── Tabs ─────────────────────────────────────────────────────

  /** Tab bar. items: [{ id, label, count }]. onClickExpr: JS expression template with {id}. */
  tabs(items, activeId, onClickExpr) {
    return `<div class="tab-bar">${items.map(t => {
      const label = t.count !== undefined ? `${t.label} (${t.count})` : t.label;
      const active = t.id === activeId ? 'tab-active' : '';
      const click = onClickExpr.replace(/\{id\}/g, t.id);
      return `<button class="tab ${active}" onclick="${click}">${label}</button>`;
    }).join('')}</div>`;
  },

  // ── Filter Bar ───────────────────────────────────────────────

  /** Filter bar from structured config. Returns HTML for table toolbar. */
  filterBar(filters) {
    return filters.map(f => {
      if (f.type === 'search') {
        return `<input type="text" class="form-control form-sm" placeholder="${f.placeholder || 'Search...'}" value="${U.escape(f.value || '')}" oninput="${f.onChange}">`;
      }
      if (f.type === 'select') {
        const opts = f.options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const label = typeof o === 'string' ? (o === 'all' ? `All ${f.label || ''}` : U.statusLabel(o)) : o.label;
          return `<option value="${val}" ${val === f.value ? 'selected' : ''}>${label}</option>`;
        }).join('');
        return `<select class="form-control form-sm" onchange="${f.onChange}">${opts}</select>`;
      }
      return '';
    }).join('');
  },

  // ── Page Actions ─────────────────────────────────────────────

  /** Row of action buttons at top of page. buttons: [{ label, onclick, variant, icon }] */
  pageActions(buttons) {
    return `<div class="page-actions">${buttons.map(b =>
      `<button class="btn btn-${b.variant || 'secondary'}" onclick="${b.onclick}">${b.icon || ''}${b.label}</button>`
    ).join('')}</div>`;
  },

  /** Single action button (for table cells) */
  actionBtn(label, onclick, variant = 'secondary', size = 'xs') {
    return `<button class="btn btn-${size} btn-${variant}" onclick="${onclick}">${label}</button>`;
  },

  // ── Alerts ───────────────────────────────────────────────────

  /** Single alert item */
  alertItem(a) {
    return `<div class="alert-item alert-${a.level}">
      <div class="alert-dot"></div>
      <div class="alert-content">
        <div class="alert-title">${U.escape(a.title)}</div>
        <div class="alert-message">${U.escape(a.message)}</div>
      </div>
      <div class="alert-time">${U.ago(a.time)}</div>
    </div>`;
  },

  /** Alert feed (list of alerts) */
  alertFeed(alerts) {
    return alerts.map(a => this.alertItem(a)).join('');
  },

  // ── Exposure ─────────────────────────────────────────────────

  /** Horizontal exposure bar (for dashboard) */
  exposureBar(sym, e) {
    const fillClass = e.net > 0 ? 'fill-long' : 'fill-short';
    const width = Math.min(Math.abs(e.net) / 20 * 100, 100);
    return `<div class="exposure-bar">
      <span class="exposure-sym">${sym}</span>
      <div class="exposure-visual"><div class="exposure-fill ${fillClass}" style="width:${width}%"></div></div>
      <span class="exposure-val ${e.net > 0 ? 'positive' : 'negative'}">${e.net > 0 ? '+' : ''}${U.lots(e.net)} lots</span>
    </div>`;
  },

  /** Exposure heatmap cell (for dealing desk) */
  exposureCell(sym, e) {
    const border = Math.abs(e.net) > 15 ? 'exp-high' : Math.abs(e.net) > 5 ? 'exp-med' : 'exp-low';
    const bg = e.net > 0 ? 'exp-long' : 'exp-short';
    return `<div class="exposure-cell ${border} ${bg}">
      <div class="exp-sym">${sym}</div>
      <div class="exp-net">${e.net > 0 ? '+' : ''}${U.lots(e.net)}</div>
      <div class="exp-detail">L: ${U.lots(e.long)} / S: ${U.lots(e.short)}</div>
    </div>`;
  },

  // ── Composite Cards ──────────────────────────────────────────

  /** Server health card */
  serverCard(s) {
    return `<div class="server-card ${s.status}">
      <div class="server-header">
        <span class="status-dot dot-${s.status === 'healthy' ? 'green' : s.status === 'warning' ? 'yellow' : 'red'}"></span>
        <strong>${U.escape(s.name)}</strong>
        <span class="text-sm">${s.status}</span>
      </div>
      <div class="server-metrics">
        ${this.progressWithLabel('CPU', s.cpu)}
        ${this.progressWithLabel('Memory', s.memory)}
        ${this.progressWithLabel('Disk', s.disk)}
      </div>
      <div class="server-footer">
        <span>Connections: ${s.connections}</span>
        <span>Uptime: ${s.uptime}</span>
      </div>
    </div>`;
  },

  /** EMI account card */
  emiCard(e) {
    const segOk = e.segregated <= e.balance;
    return `<div class="emi-card">
      <div class="emi-header"><strong>${U.escape(e.name)}</strong>${this.badge(e.currency, 'info')}</div>
      <div class="emi-body">
        <div class="emi-row"><span>Provider</span><span>${U.escape(e.provider)}</span></div>
        <div class="emi-row"><span>Total Balance</span><span class="text-primary"><strong>${U.money(e.balance, e.currency)}</strong></span></div>
        <div class="emi-row"><span>Segregated (Client)</span><span>${U.money(e.segregated, e.currency)}</span></div>
        <div class="emi-row"><span>Operational</span><span>${U.money(e.operational, e.currency)}</span></div>
        <div class="emi-row"><span>Last Reconciled</span><span>${U.date(e.lastReconciled)}</span></div>
      </div>
      <div class="emi-footer">
        <div class="seg-check ${segOk ? 'seg-ok' : 'seg-fail'}">${segOk ? 'Segregation OK' : 'SEGREGATION SHORTFALL'}</div>
      </div>
    </div>`;
  },

  /** LP status card */
  lpStatusCard(lp) {
    const dotColor = lp.status === 'connected' ? 'green' : lp.status === 'degraded' ? 'yellow' : 'red';
    return `<div class="lp-status-card ${lp.status}">
      <div class="lp-status-header">
        <span class="status-dot dot-${dotColor}"></span>
        <strong>${U.escape(lp.name)}</strong>
      </div>
      <div class="lp-status-body">
        <div>Latency: ${this.latency(lp.avgLatency)}</div>
        <div>Uptime: ${U.pct(lp.uptime)}</div>
        <div>Session: ${U.ago(lp.sessionStart)}</div>
        <div>Last HB: ${U.ago(lp.lastHeartbeat)}</div>
      </div>
    </div>`;
  },

  // ── Utility ──────────────────────────────────────────────────

  /** Empty state message */
  emptyState(message = 'No data') {
    return `<p class="text-muted" style="text-align:center;padding:24px">${U.escape(message)}</p>`;
  },

  /** Inline table from data (for small tables that don't need DataTable) */
  simpleTable(headers, rows, opts = {}) {
    const cls = opts.compact ? 'data-table compact' : 'data-table';
    return `<table class="${cls}">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.length === 0 ? `<tr><td colspan="${headers.length}" class="empty-row">No data</td></tr>` : rows.join('')}</tbody>
    </table>`;
  },

  /** Two-column layout */
  grid2(left, right) {
    return `<div class="grid-2col">${left}${right}</div>`;
  },

  /** Section header (small label) */
  sectionLabel(text) {
    return `<h4 style="margin-bottom:8px;font-size:12px;color:var(--text-muted)">${U.escape(text)}</h4>`;
  },
};

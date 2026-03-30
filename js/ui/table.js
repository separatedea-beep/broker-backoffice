/**
 * Reusable DataTable component
 * Usage: Table.render(containerId, { columns, data, onRowClick, actions, page, pageSize, sortable, exportable })
 */
const Table = {
  _sorts: {},

  render(containerId, opts) {
    const { columns, data, onRowClick, actions, page = 1, pageSize = CONFIG.PAGE_SIZE, sortable = true, exportable = false, title = '', filters = '' } = opts;
    const container = U.$(`#${containerId}`);
    if (!container) return;

    // Sort
    const sortKey = this._sorts[containerId]?.key;
    const sortDir = this._sorts[containerId]?.dir || 'asc';
    let sorted = [...data];
    if (sortKey) {
      sorted.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (va instanceof Date) { va = va.getTime(); vb = vb?.getTime() || 0; }
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
      });
    }

    // Paginate
    const totalPages = Math.ceil(sorted.length / pageSize) || 1;
    const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

    const html = `
      ${title || filters ? `<div class="table-toolbar">
        ${title ? `<h3 class="table-title">${title}</h3>` : ''}
        <div class="table-toolbar-right">
          ${filters}
          ${exportable ? `<button class="btn btn-sm btn-secondary" onclick="Table.export('${containerId}', ${JSON.stringify(columns.map(c => c.key)).replace(/"/g, '&quot;')})">Export CSV</button>` : ''}
        </div>
      </div>` : ''}
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map(c => `
                <th class="${sortable && c.sortable !== false ? 'sortable' : ''} ${sortKey === c.key ? 'sorted-' + sortDir : ''}"
                    ${sortable && c.sortable !== false ? `onclick="Table.sort('${containerId}', '${c.key}')"` : ''}
                    style="${c.width ? 'width:' + c.width : ''} ${c.align ? 'text-align:' + c.align : ''}">
                  ${c.label}${sortKey === c.key ? (sortDir === 'asc' ? ' &#9650;' : ' &#9660;') : ''}
                </th>
              `).join('')}
              ${actions ? '<th style="width:120px">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${pageData.length === 0 ? `<tr><td colspan="${columns.length + (actions ? 1 : 0)}" class="empty-row">No data</td></tr>` : ''}
            ${pageData.map((row, ri) => `
              <tr class="${onRowClick ? 'clickable' : ''}" ${onRowClick ? `onclick="${onRowClick}('${row.id || row.ticket || row.accountId || ri}')"` : ''}>
                ${columns.map(c => `
                  <td style="${c.align ? 'text-align:' + c.align : ''}" class="${c.class ? (typeof c.class === 'function' ? c.class(row) : c.class) : ''}">
                    ${c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')}
                  </td>
                `).join('')}
                ${actions ? `<td class="actions-cell">${actions(row)}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="table-info">Showing ${((page-1)*pageSize)+1}-${Math.min(page*pageSize, sorted.length)} of ${sorted.length}</span>
        <div class="pagination">
          <button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="Table.page('${containerId}', ${page - 1})">Prev</button>
          <span class="page-num">Page ${page} of ${totalPages}</span>
          <button class="btn btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="Table.page('${containerId}', ${page + 1})">Next</button>
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  sort(containerId, key) {
    const cur = this._sorts[containerId];
    if (cur?.key === key) {
      this._sorts[containerId].dir = cur.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sorts[containerId] = { key, dir: 'asc' };
    }
    BO.renderCurrentView();
  },

  page(containerId, p) {
    // The renderer needs to track its own page state; we call re-render
    // Each module sets its page in state and re-renders
    const viewMap = {
      'accounts-table': () => { S.accounts.page = p; },
      'trades-table': () => { S.trades.page = p; },
      'deposits-table': () => { S.deposits.page = p; },
      'ib-table': () => { S.ib.page = p; },
    };
    if (viewMap[containerId]) viewMap[containerId]();
    BO.renderCurrentView();
  },

  export(containerId, keys) {
    Toast.info('Exporting...');
  },
};


/**
 * Pre-built column configurations for common data types.
 * Usage: Table.render('id', { columns: [Columns.money('balance','Balance'), Columns.book('book')], data })
 */
const Columns = {
  /** Right-aligned money column */
  money(key, label, ccy) {
    return { key, label, align: 'right', render: (v) => U.money(v, ccy) };
  },
  /** P&L with color and sign */
  pnl(key, label) {
    return { key, label, align: 'right', render: (v) => C.pnl(v) };
  },
  /** Bold P&L */
  pnlBold(key, label) {
    return { key, label, align: 'right', render: (v) => C.pnlBold(v) };
  },
  /** Status badge (auto-colored) */
  badge(key, label) {
    return { key, label, render: (v) => C.badge(v) };
  },
  /** A/B Book badge */
  book(key = 'book') {
    return { key, label: 'Book', render: (v) => C.bookBadge(v) };
  },
  /** Buy/Sell direction badge */
  direction(key = 'direction') {
    return { key, label: 'Dir', render: (v) => C.dirBadge(v) };
  },
  /** Formatted date */
  date(key, label) {
    return { key, label, render: (v) => U.date(v) };
  },
  /** Formatted datetime */
  datetime(key, label) {
    return { key, label, render: (v) => U.datetime(v) };
  },
  /** Time ago */
  ago(key, label) {
    return { key, label, render: (v) => U.ago(v) };
  },
  /** Lot volume */
  lots(key, label = 'Volume') {
    return { key, label, align: 'right', render: (v) => U.lots(v) };
  },
  /** Percentage */
  pct(key, label, dec = 1) {
    return { key, label, align: 'right', render: (v) => U.pct(v, dec) };
  },
  /** Toxicity badge */
  toxicity(key = 'toxicity') {
    return { key, label: 'Toxicity', align: 'center', render: (v) => C.toxBadge(v) };
  },
  /** PoR badge */
  por(key = 'por') {
    return { key, label: 'PoR', align: 'center', render: (v) => C.porBadge(v) };
  },
  /** Margin level with threshold coloring */
  marginLevel(key = 'marginLevel') {
    return { key, label: 'Margin %', align: 'right', render: (v) => C.marginLevel(v) };
  },
  /** Latency with warning threshold */
  latency(key, label = 'Latency') {
    return { key, label, align: 'right', render: (v) => C.latency(v) };
  },
  /** Slippage with warning */
  slippage(key, label = 'Slippage') {
    return { key, label, align: 'right', render: (v) => C.slippage(v) };
  },
  /** Clickable name (text-primary) */
  name(key, label = 'Name') {
    return { key, label, render: (v) => `<span class="text-primary">${U.escape(v)}</span>` };
  },
  /** Leverage display */
  leverage(key = 'leverage') {
    return { key, label: 'Lev', width: '50px', render: (v) => '1:' + v };
  },
  /** Number with decimal places */
  num(key, label, dec = 2) {
    return { key, label, align: 'right', render: (v) => U.num(v, dec) };
  },
  /** Text column (basic, sortable) */
  text(key, label, opts = {}) {
    return { key, label, ...opts };
  },
  /** Dispute flag icon */
  disputeFlag(key = 'disputeFlag') {
    return { key, label: '!', width: '30px', render: (v) => v ? '<span class="text-danger" title="Disputed">&#9888;</span>' : '' };
  },
  /** Risk flags array */
  riskFlags(key = 'riskFlags') {
    return { key, label: 'Flags', render: (v) => v && v.length ? v.map(f => C.badge(f, 'danger')).join(' ') : '-' };
  },
  /** Utilisation progress bar */
  utilisation(key, label = 'Utilisation') {
    return { key, label, render: (v, row) => {
      const max = row.creditLine || 100;
      return C.progressBar(v, 100) + `<span class="text-sm">${U.pct(v)}</span>`;
    }};
  },
};

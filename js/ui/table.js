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
    // Grab the data from the current state based on container
    Toast.info('Exporting...');
  },
};

/**
 * Shared utility functions
 */
const U = {
  // DOM helpers
  $(sel) { return document.querySelector(sel); },
  $$(sel) { return document.querySelectorAll(sel); },
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  // Formatters
  money(v, ccy = 'USD') {
    if (v == null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, minimumFractionDigits: 2 }).format(v);
  },
  num(v, dec = 2) {
    if (v == null) return '-';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  },
  pct(v, dec = 1) {
    if (v == null) return '-';
    return v.toFixed(dec) + '%';
  },
  lots(v) {
    return v != null ? v.toFixed(2) : '-';
  },
  pips(v) {
    return v != null ? v.toFixed(1) : '-';
  },
  date(d) {
    if (!d) return '-';
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  time(d) {
    if (!d) return '-';
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },
  datetime(d) {
    if (!d) return '-';
    return U.date(d) + ' ' + U.time(d);
  },
  ago(d) {
    if (!d) return '-';
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60000) return Math.floor(ms / 1000) + 's ago';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
    return Math.floor(ms / 86400000) + 'd ago';
  },

  // Color helpers
  pnlClass(v) { return v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral'; },
  pnlSign(v) { return v > 0 ? '+' : ''; },
  statusClass(s) {
    const map = {
      active: 'badge-success', approved: 'badge-success', matched: 'badge-success', connected: 'badge-success', completed: 'badge-success', funded: 'badge-success',
      pending: 'badge-warning', pending_review: 'badge-warning', under_investigation: 'badge-warning', degraded: 'badge-warning', partial: 'badge-warning', investigating: 'badge-warning', open: 'badge-warning', processing: 'badge-warning',
      rejected: 'badge-danger', closed: 'badge-danger', suspended: 'badge-danger', break: 'badge-danger', disconnected: 'badge-danger', overdue: 'badge-danger', failed: 'badge-danger', cancelled: 'badge-danger',
      resolved_client: 'badge-info', resolved_broker: 'badge-info', force_matched: 'badge-info', escalated: 'badge-info', maintenance: 'badge-info',
    };
    return map[s] || 'badge-default';
  },

  // Unique ID
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  // Deep clone
  clone(o) { return JSON.parse(JSON.stringify(o)); },

  // Label formatters
  bookLabel(v) { return v === 'a_book' ? 'A' : v === 'b_book' ? 'B' : v; },
  dirLabel(v) { return v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'; },
  statusLabel(v) { return v ? v.replace(/_/g, ' ') : '-'; },

  // HTML escape (prevent XSS)
  escape(str) {
    if (str == null) return '';
    const s = String(str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Random helpers for mock data
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(U.rand(min, max + 1)); },
  pick(arr) { return arr[U.randInt(0, arr.length - 1)]; },
  jitter(v, pct = 0.05) { return v * (1 + (Math.random() - 0.5) * 2 * pct); },

  // Debounce
  debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // CSV export
  exportCSV(rows, filename) {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => {
      let v = r[k];
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) v = '"' + v.replace(/"/g, '""') + '"';
      return v ?? '';
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

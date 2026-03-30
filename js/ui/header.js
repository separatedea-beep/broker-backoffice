/**
 * Header — page title, clocks, bridge status, notifications
 */
const Header = {
  render() {
    this.updateClocks();
    this.updateBridgeStatus();
    this.updateNotifBadge();
  },

  updateClocks() {
    const el = U.$('#header-clocks');
    el.innerHTML = CONFIG.CLOCKS.map(c => {
      const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: c.tz });
      return `<span class="clock"><span class="clock-label">${c.label}</span><span class="clock-time">${t}</span></span>`;
    }).join('');
  },

  updateBridgeStatus() {
    const dot = U.$('#bridge-dot');
    dot.className = 'status-dot ' + (S.bridge.connected ? 'dot-green' : 'dot-red');
  },

  updateNotifBadge() {
    const badge = U.$('#notif-badge');
    const count = S.dashboard.alerts.filter(a => a.level === 'critical' || a.level === 'warning').length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  },

  setTitle(title, breadcrumb) {
    U.$('#page-title').textContent = title;
    U.$('#breadcrumb').innerHTML = breadcrumb || '';
  },
};

// Update clocks every 30s
setInterval(() => Header.updateClocks(), 30000);

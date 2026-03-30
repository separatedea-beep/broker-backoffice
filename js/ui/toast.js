/**
 * Toast notifications
 */
const Toast = {
  show(message, type = 'info', duration = 4000) {
    const container = U.$('#toast-container');
    const toast = U.el('div', `toast toast-${type}`, `
      <span class="toast-icon">${type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : type === 'warning' ? '&#9888;' : '&#8505;'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `);
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 300); }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 6000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); },
};

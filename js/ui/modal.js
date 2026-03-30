/**
 * Modal system
 */
const Modal = {
  open(title, bodyHtml, footerHtml) {
    U.$('#modal-title').textContent = title;
    U.$('#modal-body').innerHTML = bodyHtml;
    U.$('#modal-footer').innerHTML = footerHtml || '';
    U.$('#modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  close() {
    U.$('#modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
  },

  confirm(title, message, onConfirm) {
    this.open(title,
      `<p>${message}</p>`,
      `<button class="btn btn-secondary" onclick="BO.ui.closeModal()">Cancel</button>
       <button class="btn btn-danger" onclick="(${onConfirm.toString()})(); BO.ui.closeModal();">Confirm</button>`
    );
  },

  form(title, fields, onSubmit) {
    const html = fields.map(f => {
      if (f.type === 'select') {
        return `<div class="form-group">
          <label>${f.label}</label>
          <select id="modal-${f.name}" class="form-control">${f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
        </div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="form-group">
          <label>${f.label}</label>
          <textarea id="modal-${f.name}" class="form-control" rows="3">${f.value || ''}</textarea>
        </div>`;
      }
      return `<div class="form-group">
        <label>${f.label}</label>
        <input type="${f.type || 'text'}" id="modal-${f.name}" class="form-control" value="${f.value || ''}" ${f.placeholder ? 'placeholder="' + f.placeholder + '"' : ''} ${f.readonly ? 'readonly' : ''}>
      </div>`;
    }).join('');

    this.open(title, html,
      `<button class="btn btn-secondary" onclick="BO.ui.closeModal()">Cancel</button>
       <button class="btn btn-primary" id="modal-submit">Save</button>`
    );

    U.$('#modal-submit').onclick = () => {
      const data = {};
      fields.forEach(f => {
        const el = U.$(`#modal-${f.name}`);
        data[f.name] = el ? el.value : '';
      });
      onSubmit(data);
      this.close();
    };
  },
};

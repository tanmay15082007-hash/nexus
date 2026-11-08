/**
 * NEXUS - In-app dialogs (replaces alert / confirm / prompt)
 * Dialog.alert(msg, opts) -> Promise<true>
 * Dialog.confirm(msg, opts) -> Promise<boolean>
 * Dialog.prompt(msg, opts) -> Promise<string|null>   (opts.type: 'text' | 'date')
 * Dialog.choice(msg, {options:[{label,value,primary,danger}]}) -> Promise<value|null>
 */
window.NexusApp = window.NexusApp || {};

window.NexusApp.Dialog = (function () {
  const INPUT = '__input__';
  let host = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function open(o) {
    return new Promise((resolve) => {
      if (!host) {
        host = document.createElement('div');
        host.id = 'nexus-dialog-root';
        document.body.appendChild(host);
      }
      const prev = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'nx-dialog-backdrop';

      const btns = o.buttons.map((b, i) => {
        const cls = b.danger ? 'nexus-btn-danger' : (b.primary ? 'nexus-btn-primary' : 'nexus-btn-secondary');
        return `<button type="button" class="nexus-btn ${cls}" data-i="${i}">${esc(b.label)}</button>`;
      }).join('');

      wrap.innerHTML = `
        <div class="nx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nx-d-title" aria-describedby="nx-d-msg">
          <div class="nx-dialog-title" id="nx-d-title">${esc(o.title)}</div>
          <div class="nx-dialog-msg" id="nx-d-msg">${esc(o.message)}</div>
          ${o.input ? `<input class="form-input nx-dialog-input" type="${o.type === 'date' ? 'date' : 'text'}"
                value="${esc(o.value)}" placeholder="${esc(o.placeholder)}" aria-label="${esc(o.title)}">` : ''}
          <div class="nx-dialog-actions">${btns}</div>
        </div>`;
      host.appendChild(wrap);

      const dlg = wrap.querySelector('.nx-dialog');
      const input = wrap.querySelector('.nx-dialog-input');
      let finished = false;

      function close(val) {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
        resolve(val);
      }
      function pick(i) {
        const b = o.buttons[i];
        close(b.value === INPUT ? input.value.trim() : b.value);
      }
      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation(); close(o.cancel); return;
        }
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
          e.preventDefault(); e.stopPropagation();
          const i = o.buttons.findIndex(b => b.primary);
          pick(i >= 0 ? i : o.buttons.length - 1);
          return;
        }
        if (e.key === 'Tab') {
          const f = dlg.querySelectorAll('button, input');
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (!dlg.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
          else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }

      document.addEventListener('keydown', onKey, true);
      // keep app shortcuts (N, T, C...) from firing while a dialog is open
      wrap.addEventListener('keydown', (e) => e.stopPropagation());
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (b) pick(Number(b.getAttribute('data-i')));
        else if (e.target === wrap) close(o.cancel);
      });

      if (input) { input.focus(); if (input.select) input.select(); }
      else {
        const p = wrap.querySelector('.nexus-btn-primary, .nexus-btn-danger') || wrap.querySelector('button');
        if (p) p.focus();
      }
    });
  }

  return {
    alert(message, o = {}) {
      return open({ title: o.title || 'NOTICE', message, cancel: true,
        buttons: [{ label: o.okLabel || 'OK', value: true, primary: true }] });
    },
    confirm(message, o = {}) {
      return open({ title: o.title || 'CONFIRM', message, cancel: false,
        buttons: [
          { label: o.cancelLabel || 'CANCEL', value: false },
          { label: o.okLabel || 'OK', value: true, primary: !o.danger, danger: !!o.danger }
        ] });
    },
    prompt(message, o = {}) {
      return open({ title: o.title || 'INPUT', message, input: true, type: o.type,
        value: o.value, placeholder: o.placeholder, cancel: null,
        buttons: [
          { label: 'CANCEL', value: null },
          { label: o.okLabel || 'OK', value: INPUT, primary: true }
        ] });
    },
    choice(message, o = {}) {
      return open({ title: o.title || 'CHOOSE', message, cancel: null, buttons: o.options || [] });
    }
  };
})();

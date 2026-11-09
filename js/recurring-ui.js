/**
 * NEXUS - Recurring panel (compact list)
 * Replaces UI.renderRecurringPanel with a compact, searchable, collapsible list.
 * Loads right after ui.js.
 */
(function () {
  const App = window.NexusApp;
  const UI = App.UI;
  if (!UI) return;

  const State = App.State;
  const Dates = App.Dates;
  const Tasks = App.Tasks;
  const Rec = App.Recurring;
  const $ = (id) => document.getElementById(id);
  const esc = UI.escapeHTML;

  let query = '';
  let expandedId = null;
  let formOpen = false;
  let chromeReady = false;

  function repeatText(rep) {
    rep = rep || { type: 'daily' };
    if (rep.type === 'weekdays') return 'Mon–Fri';
    if (rep.type === 'weekly') return 'Weekly: ' + (rep.days || []).map(d => Dates.DAY_NAMES_SHORT[d]).join(', ');
    if (rep.type === 'monthly') return 'Monthly: day ' + rep.dayOfMonth;
    return 'Daily';
  }

  // Streak + last 7 days for one routine
  function history(tpl) {
    const today = Dates.getTodayStr();
    const doneMap = tpl.completions || {};
    const runsOn = (d) => {
      // ignore the paused flag so history stays visible
      return Rec.doesTemplateMatchDate(Object.assign({}, tpl, { paused: false }), d);
    };

    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = Dates.addDays(today, -i);
      dots.push({ d, scheduled: runsOn(d), done: Boolean(doneMap[d]) });
    }

    let streak = 0;
    for (let i = 0; i < 120; i++) {
      const d = Dates.addDays(today, -i);
      if (!runsOn(d)) continue;
      if (doneMap[d]) streak++;
      else if (i === 0) continue;   // today is still in progress
      else break;
    }
    return { dots, streak };
  }

  /* ---------------- list ---------------- */
  function renderList() {
    const listEl = $('recurring-templates-list');
    if (!listEl) return;

    const all = State.getData().recurring || [];
    const q = query.toLowerCase().trim();
    const shown = all.filter(t => !q || (t.title || '').toLowerCase().includes(q));
    const active = all.filter(t => !t.paused).length;

    const summary = $('rec-summary');
    if (summary) {
      summary.textContent = all.length
        ? `${all.length} routine${all.length === 1 ? '' : 's'} · ${active} active` + (q ? ` · ${shown.length} shown` : '')
        : '';
    }
    const filter = $('rec-filter-input');
    if (filter) filter.style.display = all.length > 5 ? '' : 'none';

    if (all.length === 0) {
      listEl.innerHTML = '<div class="empty-state-notice">No recurring routines established yet. Configure your first one below.</div>';
      return;
    }
    if (shown.length === 0) {
      listEl.innerHTML = '<div class="empty-state-notice">No routines match your search.</div>';
      return;
    }

    listEl.innerHTML = shown.map(tpl => {
      const h = history(tpl);
      const open = expandedId === tpl.id;
      const rep = repeatText(tpl.repeat);
      return `
        <div class="rec-row ${open ? 'is-open' : ''} ${tpl.paused ? 'is-paused' : ''}">
          <button type="button" class="rec-row-head" data-id="${tpl.id}" aria-expanded="${open}">
            <div class="rec-row-line1">
              <span class="rec-row-title">${esc(tpl.title)}</span>
              <span class="rec-row-streak" title="Current streak">🔥 ${h.streak}</span>
              <span class="rec-chevron" aria-hidden="true">▼</span>
            </div>
            <div class="rec-row-line2">
              <span class="rec-row-sub">${esc(rep)}${tpl.time ? ' · ' + esc(tpl.time) : ''}${tpl.paused ? ' <span class="rec-paused-tag">PAUSED</span>' : ''}</span>
              <span class="rec-dots" aria-label="Last 7 days">${h.dots.map(d =>
                `<i class="rec-dot ${!d.scheduled ? 'off' : (d.done ? 'done' : 'miss')}" title="${d.d}"></i>`).join('')}</span>
            </div>
          </button>
          ${open ? `
          <div class="rec-row-body">
            <div class="rec-row-details">
              <span>Repeats: ${esc(rep)}${tpl.time ? ' at ' + esc(tpl.time) : ''}</span>
              <span>Starts: ${esc(tpl.startDate || '-')}${tpl.endDate ? ' · Ends: ' + esc(tpl.endDate) : ''}</span>
              <span>Priority: ${esc(tpl.priority || 'medium')} · Category: ${esc(tpl.tag || 'work')}</span>
              <span class="rec-legend">Dots = last 7 days (green done, red missed, faded not scheduled)</span>
            </div>
            <div class="rec-row-actions">
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-secondary" data-act="edit" data-id="${tpl.id}">EDIT</button>
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-secondary" data-act="pause" data-id="${tpl.id}">${tpl.paused ? 'RESUME' : 'PAUSE'}</button>
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-danger" data-act="delete" data-id="${tpl.id}">DELETE</button>
            </div>
          </div>` : ''}
        </div>`;
    }).join('');
  }

  async function onListClick(e) {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      const tpl = (State.getData().recurring || []).find(t => t.id === id);
      if (!tpl) return;

      if (act === 'edit') {
        startEdit(tpl);
      } else if (act === 'pause') {
        Rec.togglePauseTemplate(id);
        renderList();
      } else if (act === 'delete') {
        const ok = await App.Dialog.confirm('Delete this recurring routine? Past completions are removed with it.', {
          title: 'DELETE ROUTINE', okLabel: 'DELETE', danger: true
        });
        if (!ok) return;
        Rec.deleteTemplate(id);
        if (($('rec-edit-id') || {}).value === id) { resetForm(); formOpen = false; syncForm(); }
        expandedId = null;
        renderList();
        UI.showToast('Routine deleted', 'UNDO', () => { Tasks.undoLastAction(); renderList(); });
      }
      return;
    }

    const head = e.target.closest('.rec-row-head');
    if (head) {
      const id = head.getAttribute('data-id');
      expandedId = expandedId === id ? null : id;
      renderList();
    }
  }

  /* ---------------- form ---------------- */
  function syncType() {
    const typeSel = $('rec-type-select');
    $('rec-weekly-wrap').style.display = typeSel.value === 'weekly' ? 'block' : 'none';
    $('rec-monthly-wrap').style.display = typeSel.value === 'monthly' ? 'block' : 'none';
  }

  function resetForm() {
    const form = $('new-recurring-form');
    form.reset();
    $('rec-edit-id').value = '';
    $('rec-submit-btn').textContent = '+ ACTIVATE ROUTINE';
    $('rec-cancel-edit-btn').style.display = 'none';
    $('rec-start-date').value = Dates.getTodayStr();
    syncType();
  }

  function syncForm() {
    const form = $('new-recurring-form');
    const btn = $('rec-toggle-form-btn');
    const empty = (State.getData().recurring || []).length === 0;
    const editing = Boolean($('rec-edit-id').value);
    const visible = formOpen || editing || empty;
    form.style.display = visible ? 'block' : 'none';
    if (btn) {
      btn.style.display = empty ? 'none' : '';
      btn.textContent = visible ? '− CLOSE FORM' : '+ NEW ROUTINE';
    }
  }

  function startEdit(tpl) {
    const form = $('new-recurring-form');
    formOpen = true;
    $('rec-edit-id').value = tpl.id;
    $('rec-title-input').value = tpl.title || '';
    $('rec-type-select').value = (tpl.repeat && tpl.repeat.type) || 'daily';
    $('rec-time-input').value = tpl.time || '';
    $('rec-priority-select').value = tpl.priority || 'medium';
    const tagSel = $('rec-tag-select');
    const tagVal = tpl.tag || 'work';
    if (![...tagSel.options].some(o => o.value === tagVal)) tagSel.add(new Option(tagVal, tagVal));
    tagSel.value = tagVal;
    $('rec-start-date').value = tpl.startDate || Dates.getTodayStr();
    $('rec-end-date').value = tpl.endDate || '';
    $('rec-month-day').value = (tpl.repeat && tpl.repeat.dayOfMonth) || 1;
    const days = (tpl.repeat && tpl.repeat.days) || [];
    form.querySelectorAll('#rec-day-picker input').forEach(cb => {
      cb.checked = tpl.repeat && tpl.repeat.type === 'weekly' && days.includes(Number(cb.value));
    });
    $('rec-submit-btn').textContent = 'SAVE CHANGES';
    $('rec-cancel-edit-btn').style.display = 'inline-flex';
    syncType();
    syncForm();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireForm() {
    const form = $('new-recurring-form');
    const Dialog = App.Dialog;

    $('rec-type-select').onchange = syncType;
    $('rec-cancel-edit-btn').onclick = () => { resetForm(); formOpen = false; syncForm(); };
    if (!$('rec-start-date').value) $('rec-start-date').value = Dates.getTodayStr();
    syncType();

    form.onsubmit = async (e) => {
      e.preventDefault();
      const title = $('rec-title-input').value.trim();
      const type = $('rec-type-select').value;
      const time = $('rec-time-input').value;
      const priority = $('rec-priority-select').value;
      const tag = $('rec-tag-select').value;
      const startDate = $('rec-start-date').value || Dates.getTodayStr();
      const endDate = $('rec-end-date').value || null;
      const picked = Array.from(form.querySelectorAll('#rec-day-picker input:checked')).map(cb => Number(cb.value));
      const dayOfMonth = Math.min(31, Math.max(1, parseInt($('rec-month-day').value, 10) || 1));

      if (!title) return;
      if (type === 'weekly' && picked.length === 0) {
        await Dialog.alert('Pick at least one day of the week.', { title: 'REPEAT DAYS' });
        return;
      }
      if (endDate && endDate < startDate) {
        await Dialog.alert('The end date must be after the start date.', { title: 'DATE RANGE' });
        return;
      }

      const repeat = {
        type,
        days: type === 'weekly' ? picked : [0, 1, 2, 3, 4, 5, 6],
        dayOfMonth: type === 'monthly' ? dayOfMonth : 1
      };

      const editId = $('rec-edit-id').value;
      if (editId) {
        const tpl = (State.getData().recurring || []).find(r => r.id === editId);
        if (tpl) {
          Object.assign(tpl, { title, time, priority, tag, startDate, endDate, repeat });
          State.commit('recurringUpdate');
          UI.showToast(`Recurring routine "${title}" updated`);
        }
      } else {
        Rec.createTemplate({ title, time, priority, tag, startDate, endDate, repeat });
        UI.showToast(`Recurring routine "${title}" active`);
      }
      resetForm();
      formOpen = false;
      syncForm();
      renderList();
    };
  }

  /* ---------------- panel entry point ---------------- */
  function renderPanel() {
    const listEl = $('recurring-templates-list');
    const form = $('new-recurring-form');
    if (!listEl || !form) return;

    if (!chromeReady) {
      chromeReady = true;

      // summary line + search box above the list
      const tools = document.createElement('div');
      tools.className = 'rec-tools';
      tools.innerHTML = `
        <div class="rec-summary" id="rec-summary"></div>
        <input type="search" id="rec-filter-input" class="form-input rec-filter" placeholder="Search routines..." aria-label="Search routines" style="display:none;">`;
      listEl.parentNode.insertBefore(tools, listEl);
      $('rec-filter-input').addEventListener('input', (e) => { query = e.target.value; renderList(); });

      listEl.addEventListener('click', onListClick);

      // collapsible "new routine" form
      const heading = form.previousElementSibling;
      if (heading && heading.tagName === 'H4') heading.style.display = 'none';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'rec-toggle-form-btn';
      btn.className = 'nexus-btn nexus-btn-secondary rec-toggle-btn';
      form.parentNode.insertBefore(btn, form);
      btn.addEventListener('click', () => {
        formOpen = !formOpen;
        if (!formOpen) resetForm();
        syncForm();
      });
    }

    wireForm();
    syncForm();
    renderList();
  }

  UI.renderRecurringPanel = renderPanel;

  // keep the list fresh while the panel is open (for example after Undo)
  State.subscribe(() => {
    const p = $('panel-recurring');
    if (p && p.classList.contains('active') && chromeReady) renderList();
  });
})();

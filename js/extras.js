/**
 * NEXUS - Extras: quick-add parser, Focus 3, reminders, morning check-in,
 * weekly review, tab progress/badge, haptics, accessibility helpers.
 */
window.NexusApp = window.NexusApp || {};

window.NexusApp.Extras = (function () {
  const App = window.NexusApp;
  const $ = (id) => document.getElementById(id);

  const LS = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  };

  /* ---------------- Haptics (mobile only) ---------------- */
  function haptic(pattern) {
    try {
      if (!navigator.vibrate) return;
      if (App.State.getSettings().hapticsEnabled === false) return;
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      navigator.vibrate(pattern);
    } catch (e) {}
  }

  /* ---------------- Quick-add parser ----------------
     "gym tomorrow 6pm high #fitness" -> title, date, time, priority, tag */
  const WEEKDAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
    wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  const PRIORITIES = { low: 'low', medium: 'medium', med: 'medium', high: 'high', critical: 'critical', urgent: 'critical' };

  function parseQuickAdd(raw) {
    const Dates = App.Dates;
    const today = Dates.getTodayStr();
    const out = { title: raw.trim(), date: null, time: null, priority: null, tag: null };
    let text = ' ' + raw.trim() + ' ';
    let m;

    // #tag
    m = text.match(/\s#([a-z0-9_-]+)(?=\s)/i);
    if (m) { out.tag = m[1].toLowerCase(); text = text.replace(m[0], ' '); }

    // priority: "!high" anywhere, or a priority word as the LAST word
    m = text.match(/\s!(low|medium|med|high|critical|urgent)(?=\s)/i) ||
        text.match(/\s(low|medium|med|high|critical|urgent)\s*$/i);
    if (m) { out.priority = PRIORITIES[m[1].toLowerCase()]; text = text.replace(m[0], ' '); }

    // time: 18:30, 6:30pm, 6pm, "at 6pm"
    let h = null, min = 0, ap = null;
    m = text.match(/\s(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?(?=\s)/i);
    if (m) { h = +m[1]; min = +m[2]; ap = m[3]; }
    else {
      m = text.match(/\s(?:at\s+)?(\d{1,2})\s*(am|pm)(?=\s)/i);
      if (m) { h = +m[1]; min = 0; ap = m[2]; }
    }
    if (m) {
      if (ap) {
        ap = ap.toLowerCase();
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
      }
      if (h <= 23 && min <= 59) {
        out.time = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
        text = text.replace(m[0], ' ');
      }
    }

    // date: today, tomorrow, in N days, YYYY-MM-DD, weekday names
    const todayDow = Dates.strToDate(today).getDay();
    if ((m = text.match(/\s(today|tonight)(?=\s)/i))) {
      out.date = today; text = text.replace(m[0], ' ');
    } else if ((m = text.match(/\s(tomorrow|tmrw|tmr)(?=\s)/i))) {
      out.date = Dates.addDays(today, 1); text = text.replace(m[0], ' ');
    } else if ((m = text.match(/\sin\s+(\d{1,3})\s+days?(?=\s)/i))) {
      out.date = Dates.addDays(today, +m[1]); text = text.replace(m[0], ' ');
    } else if ((m = text.match(/\s(\d{4}-\d{2}-\d{2})(?=\s)/))) {
      out.date = m[1]; text = text.replace(m[0], ' ');
    } else if ((m = text.match(/\s(?:on\s+|next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)(?=\s)/i))) {
      let diff = (WEEKDAYS[m[1].toLowerCase()] - todayDow + 7) % 7;
      if (diff === 0) diff = 7;
      out.date = Dates.addDays(today, diff);
      text = text.replace(m[0], ' ');
    }

    const title = text.replace(/\s+/g, ' ').trim().replace(/\s+(at|on|by)$/i, '');
    out.title = title || raw.trim();
    return out;
  }

  function bindQuickAddPreview() {
    const input = $('home-quick-add-input');
    const chips = $('nlp-preview-chips');
    if (input && chips) {
      input.addEventListener('input', () => {
        const v = input.value.trim();
        if (!v) { chips.style.display = 'none'; chips.innerHTML = ''; return; }
        const p = parseQuickAdd(v);
        const parts = [];
        if (p.date) parts.push('DATE ' + App.Dates.formatDisplayDate(p.date, 'short'));
        if (p.time) parts.push('TIME ' + p.time);
        if (p.priority) parts.push('PRIORITY ' + p.priority.toUpperCase());
        if (p.tag) parts.push('TAG ' + p.tag.toUpperCase());
        if (!parts.length) { chips.style.display = 'none'; chips.innerHTML = ''; return; }
        const e = App.UI.escapeHTML;
        chips.innerHTML = `<span class="nlp-chip nlp-chip-title">${e(p.title)}</span>` +
          parts.map(t => `<span class="nlp-chip">${e(t)}</span>`).join('');
        chips.style.display = 'flex';
      });
    }
    // Android: show a visible "Time" hint when the time field is empty
    const field = $('home-time-field');
    const time = $('home-quick-add-time');
    if (field && time) {
      const sync = () => field.classList.toggle('has-value', Boolean(time.value));
      time.addEventListener('input', sync);
      time.addEventListener('change', sync);
      sync();
    }
  }

  /* ---------------- Focus 3 (stored separately, per date) ---------------- */
  const PIN_KEY = 'nexus_focus3_v1';
  function getPins(date) {
    const all = LS.get(PIN_KEY, {});
    return Array.isArray(all[date]) ? all[date] : [];
  }
  function isPinned(id, date) { return getPins(date).includes(id); }
  function togglePin(id, date) {
    const all = LS.get(PIN_KEY, {});
    const list = Array.isArray(all[date]) ? all[date] : [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      if (list.length >= 3) { App.UI.showToast('Focus 3 is full. Unpin one first.'); return false; }
      list.push(id);
    }
    all[date] = list;
    const keys = Object.keys(all).sort();
    while (keys.length > 45) delete all[keys.shift()];
    LS.set(PIN_KEY, all);
    return true;
  }

  /* ---------------- Reminders (work while the app is open) ---------------- */
  const REM_KEY = 'nexus_reminders_fired';

  function notify(task) {
    const when = App.Dates.formatTime(task.time, App.State.getSettings().timeFormat);
    const msg = `Reminder: ${task.title} (${when})`;
    App.UI.showToast(msg, 'DONE', () => App.Tasks.toggleTaskDone(task.id, App.Dates.getTodayStr()));
    haptic([20, 60, 20]);

    if ('Notification' in window && Notification.permission === 'granted') {
      const opts = { body: `${task.title} at ${when}`, icon: 'assets/icons/icon-192.png', tag: 'nexus-' + task.id };
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification('NEXUS', opts))
          .catch(() => { try { new Notification('NEXUS', opts); } catch (e) {} });
      } else { try { new Notification('NEXUS', opts); } catch (e) {} }
    }
  }

  function checkReminders() {
    try {
      const today = App.Dates.getTodayStr();
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const fired = LS.get(REM_KEY, {});
      const list = Array.isArray(fired[today]) ? fired[today] : [];
      let changed = false;

      App.Tasks.getTasksForDate(today, false).forEach(t => {
        if (t.done || !t.time || list.includes(t.id)) return;
        const parts = t.time.split(':').map(Number);
        const tMin = parts[0] * 60 + parts[1];
        if (nowMin >= tMin && nowMin <= tMin + 10) { list.push(t.id); changed = true; notify(t); }
      });

      if (changed) {
        const fresh = {}; fresh[today] = list;   // only keep today's record
        LS.set(REM_KEY, fresh);
      }
    } catch (e) { /* never break the app for a reminder */ }
  }

  /* ---------------- Tab title + app badge ---------------- */
  function updateProgressIndicators() {
    try {
      const st = App.Tasks.getDailyStats(App.Dates.getTodayStr());
      document.title = st.total > 0 ? `(${st.percent}%) NEXUS` : 'NEXUS';
      if (navigator.setAppBadge) {
        if (st.pending > 0) navigator.setAppBadge(st.pending).catch(() => {});
        else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
      }
    } catch (e) {}
  }

  /* ---------------- Weekly review (clear layout) ---------------- */
  function renderReview() {
    const body = $('review-body');
    if (!body) return;
    const Dates = App.Dates;
    const today = Dates.getTodayStr();
    const rows = [];
    let done = 0, total = 0, missed = 0, best = null;

    for (let i = 6; i >= 0; i--) {
      const d = Dates.addDays(today, -i);
      const s = App.Tasks.getDailyStats(d);
      rows.push({ d, s });
      done += s.done;
      total += s.total;
      if (d !== today) missed += s.total - s.done;
      if (s.total > 0 && (!best || s.percent > best.s.percent ||
          (s.percent === best.s.percent && s.done > best.s.done))) best = { d, s };
    }
    const rate = total ? Math.round((done / total) * 100) : 0;
    const bestName = best ? Dates.DAY_NAMES_FULL[Dates.strToDate(best.d).getDay()] : '-';
    const bestHint = best ? `${best.s.done} of ${best.s.total} done (${best.s.percent}%)` : 'No tasks yet';
    const rangeText = `${Dates.formatDisplayDate(rows[0].d, 'short')} – ${Dates.formatDisplayDate(today, 'short')}`;

    const dayRows = rows.map(r => {
      const isToday = r.d === today;
      const empty = r.s.total === 0;
      const tone = r.s.percent === 100 ? 'is-full' : (r.s.percent >= 50 ? 'is-mid' : 'is-low');
      return `
        <div class="review-row ${isToday ? 'is-today' : ''} ${empty ? 'is-empty' : ''}">
          <div class="review-day">
            <strong>${Dates.getDayName(r.d, false)}${isToday ? ' (today)' : ''}</strong>
            <small>${Dates.formatDisplayDate(r.d, 'short')}</small>
          </div>
          <div class="review-track" role="img" aria-label="${r.s.percent}% done">
            <div class="review-fill ${tone}" style="width:${empty ? 0 : r.s.percent}%"></div>
          </div>
          <div class="review-count">
            ${empty ? '<small>No tasks</small>' : `<strong>${r.s.done} of ${r.s.total}</strong><small>${r.s.percent}% done</small>`}
          </div>
        </div>`;
    }).join('');

    body.innerHTML = `
      <p class="review-intro">Your last 7 days (${rangeText}). Here is how many tasks you finished and how many slipped.</p>

      <div class="review-grid">
        <div class="stat-chip stat-done">
          <div class="stat-chip-num">${done}</div>
          <div class="stat-chip-label">Completed</div>
          <div class="stat-chip-hint">out of ${total} tasks</div>
        </div>
        <div class="stat-chip stat-overdue">
          <div class="stat-chip-num">${missed}</div>
          <div class="stat-chip-label">Missed</div>
          <div class="stat-chip-hint">unfinished, earlier days</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-num">${rate}%</div>
          <div class="stat-chip-label">Completion rate</div>
          <div class="stat-chip-hint">completed ÷ all tasks</div>
        </div>
        <div class="stat-chip stat-pending">
          <div class="stat-chip-num" style="font-size:18px;">${bestName}</div>
          <div class="stat-chip-label">Best day</div>
          <div class="stat-chip-hint">${bestHint}</div>
        </div>
      </div>

      <div class="review-section-title">DAY BY DAY</div>
      <div class="review-section-sub">Bar colour: green = all done, amber = half or more, red = less than half.</div>
      ${dayRows}`;
  }

  function bindReview() {
    const plan = $('review-plan-btn');
    if (!plan) return;
    plan.addEventListener('click', () => {
      App.State.resetWeekTimelineToToday();
      App.State.shiftWeekTimeline(7);
      App.State.setCurrentScreen('week');
      App.Hub.closeSlidePanel('panel-review');
    });
  }

  /* ---------------- Morning check-in + Sunday review prompt ---------------- */
  async function startupPrompts() {
    const D = App.Dialog;
    const today = App.Dates.getTodayStr();

    if (LS.get('nexus_carry_prompt', '') !== today) {
      const overdue = App.Tasks.getOverdueTasks();
      if (overdue.length > 0) {
        LS.set('nexus_carry_prompt', today);
        const n = overdue.length;
        const choice = await D.choice(
          `You have ${n} unfinished directive${n === 1 ? '' : 's'} from earlier days. Move ${n === 1 ? 'it' : 'them'} to today?`,
          { title: 'MORNING CHECK-IN', options: [
            { label: 'MOVE ALL TO TODAY', value: 'move', primary: true },
            { label: 'REVIEW FIRST', value: 'review' },
            { label: 'DISMISS', value: null }
          ] });
        if (choice === 'move') App.Tasks.moveAllOverdueToToday();
        if (choice === 'review') { App.Hub.openSlidePanel('panel-transfer'); return; }
      }
    }

    if (new Date().getDay() === 0 && LS.get('nexus_review_prompt', '') !== today) {
      LS.set('nexus_review_prompt', today);
      const go = await D.confirm('It is Sunday. Open your weekly review?', { title: 'WEEKLY REVIEW', okLabel: 'OPEN REVIEW', cancelLabel: 'LATER' });
      if (go) App.Hub.openSlidePanel('panel-review');
    }
  }

  /* ---------------- Accessibility ---------------- */
  function applyAriaLabels() {
    const map = {
      'home-search-input': 'Search tasks',
      'home-filter-priority': 'Filter by priority',
      'home-filter-status': 'Filter by status',
      'hub-quick-filter-input': 'Filter command hub',
      'palette-search-input': 'Command palette search',
      'import-file-input': 'Import backup file',
      'modal-subtask-input': 'New subtask'
    };
    Object.keys(map).forEach(id => {
      const el = $(id);
      if (el && !el.getAttribute('aria-label')) el.setAttribute('aria-label', map[id]);
    });
  }

  // Keyboard on a focused task row: Space = complete, Enter = edit, Delete = remove
  function bindTaskKeyboard() {
    document.addEventListener('keydown', (e) => {
      const row = e.target.closest && e.target.closest('.nexus-floating-task');
      if (!row || e.target !== row) return;
      if (e.key === ' ') { e.preventDefault(); const c = row.querySelector('.check-node'); if (c) c.click(); }
      else if (e.key === 'Enter') { e.preventDefault(); const b = row.querySelector('.task-info-body'); if (b) b.click(); }
      else if (e.key === 'Delete') { e.preventDefault(); const d = row.querySelector('.delete-btn'); if (d) d.click(); }
    });
  }

  /* ---------------- State hook ---------------- */
  let swipeHintShown = LS.get('nexus_swipe_hint', false);
  function onStateChange() {
    updateProgressIndicators();
    if (!swipeHintShown && window.matchMedia('(pointer: coarse)').matches &&
        document.querySelector('.nexus-floating-task')) {
      swipeHintShown = true;
      LS.set('nexus_swipe_hint', true);
      App.UI.showToast('Tip: swipe a task right to complete, left to delete.');
    }
  }

  function init() {
    applyAriaLabels();
    bindTaskKeyboard();
    bindQuickAddPreview();
    bindReview();

    document.addEventListener('click', (e) => {
      const n = e.target.closest && e.target.closest('.check-node');
      if (n && !n.classList.contains('checked')) haptic(15);
    }, true);

    App.State.subscribe(onStateChange);
    onStateChange();

    setInterval(checkReminders, 15000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { checkReminders(); updateProgressIndicators(); }
    });
    checkReminders();

    setTimeout(startupPrompts, 2200);   // after the boot animation
  }

  return { init, parseQuickAdd, getPins, isPinned, togglePin, renderReview, haptic };
})();

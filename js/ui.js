/**
 * NEXUS - Primary UI & View Renderer
 * Home (Today Only, Focus 3), Week Board, Custom Lists (rename/hide/reorder),
 * recurring editor, slide-in panels, task rows, drag-and-drop, touch swipe, toasts.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.UI = (function() {
  const Dates = window.NexusApp.Dates;
  const Tasks = window.NexusApp.Tasks;
  const State = window.NexusApp.State;
  const Config = window.NexusApp.Config;
  const Audio = window.NexusApp.Audio;

  let toastTimer = null;
  let draggedTaskId = null;
  let draggedSourceDate = null;

  function init() {
    setupScreenRouter();
    setupTouchGestures();
    setupDragAndDrop();
    setupTaskEditModal();
    setupSettingsTabs();

    // Batched rendering: many changes in a row become one render per frame
    let renderQueued = false;
    let renderDirty = false;
    State.subscribe(() => {
      if (document.hidden) { renderDirty = true; return; }   // skip work while the tab is hidden
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(() => { renderQueued = false; renderActiveScreen(); });
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && renderDirty) { renderDirty = false; renderActiveScreen(); }
    });

    renderActiveScreen();
  }

  function renderActiveScreen() {
    updateTopBarGreeting();
    checkOverdueBanner();

    const screen = State.getCurrentScreen();

    // Toggle screen containers
    document.querySelectorAll('.nexus-view-screen').forEach(s => {
      s.style.display = (s.getAttribute('data-screen') === screen) ? 'block' : 'none';
    });

    if (screen === 'home') {
      renderHomeScreen();
    } else if (screen === 'week') {
      renderWeekBoardScreen();
    } else if (screen === 'lists') {
      renderCustomListsScreen();
    } else if (screen === 'stats') {
      renderStatsScreen();
    }
  }

  function updateTopBarGreeting() {
    const greetingEl = document.getElementById('top-bar-greeting-text');
    const subtitleEl = document.getElementById('top-bar-stardate');
    const clockEl = document.getElementById('top-bar-clock');
    const dateEl = document.getElementById('top-bar-date');

    const s = State.getSettings();
    const userName = s.userName || 'Commander';

    const hour = new Date().getHours();
    let timeGreet = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreet = 'Good afternoon';
    else if (hour >= 17) timeGreet = 'Good evening';

    if (greetingEl) {
      greetingEl.innerHTML = `${timeGreet}, <span class="user-moniker">${escapeHTML(userName)}</span>`;
    }

    if (subtitleEl) {
      subtitleEl.style.display = 'none'; // date shows only in the clock block
    }

    if (clockEl) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const sec = String(now.getSeconds()).padStart(2, '0');
      clockEl.innerHTML = `${h}<span class="clock-colon">:</span>${m}<span class="clock-colon">:</span>${sec}`;
    }

    if (dateEl) {
      dateEl.textContent = Dates.formatDisplayDate(Dates.getTodayStr(), 'header');
    }
  }

  /* ========================================================================
     SCREEN 1: HOME (TODAY ONLY)
     ======================================================================== */
  function renderHomeScreen() {
    const today = Dates.getTodayStr();
    const stats = Tasks.getDailyStats(today);
    const tasks = Tasks.getTasksForDate(today, true);
    const filtersStrip = document.getElementById('home-filters-strip');
    if (filtersStrip) filtersStrip.style.display = stats.total > 0 ? '' : 'none';

    // 1. Centerpiece Holographic Donut Chart
    window.NexusApp.Charts.renderHolographicDonut('home-donut-container', stats.percent, stats.done, stats.total);

    // 2. Stat Chips
    const totalEl = document.getElementById('stat-chip-total');
    const doneEl = document.getElementById('stat-chip-done');
    const pendingEl = document.getElementById('stat-chip-pending');
    const overdueEl = document.getElementById('stat-chip-overdue');

    if (totalEl) totalEl.textContent = stats.total;
    if (doneEl) doneEl.textContent = stats.done;
    if (pendingEl) pendingEl.textContent = stats.pending;
    if (overdueEl) overdueEl.textContent = stats.overdue;

    // 3. Today's Date Banner
    const dateBanner = document.getElementById('home-today-date-text');
    if (dateBanner) {
      dateBanner.textContent = Dates.formatDisplayDate(today, 'full');
    }

    // 4. Task list (Today Only)
    const listEl = document.getElementById('home-tasks-container');
    if (!listEl) return;

    if (tasks.length === 0) {
      const hasTasksButFiltered = stats.total > 0;
      listEl.dataset.sig = '';
      listEl.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-core-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="8 12 11 15 16 9"></polyline>
            </svg>
          </div>
          <h4>${hasTasksButFiltered ? 'No tasks match your filters.' : 'No tasks for today.'}</h4>
          <p>${hasTasksButFiltered ? 'Clear the search or filters to see your tasks.' : 'Add your first task to get started.'}</p>
          ${hasTasksButFiltered ? '' : '<button type="button" class="nexus-btn nexus-btn-primary" id="btn-empty-add-task" style="margin-top: 14px;">Add your first task</button>'}
        </div>
      `;
      const addBtn = listEl.querySelector('#btn-empty-add-task');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const input = document.getElementById('home-quick-add-input');
          if (input) input.focus();
        });
      }
      return;
    }

    // Focus 3: pinned tasks first, shown larger
    const Ex = window.NexusApp.Extras;
    const pinIds = Ex ? Ex.getPins(today) : [];
    const pinned = tasks.filter(t => pinIds.includes(t.id));
    const others = tasks.filter(t => !pinIds.includes(t.id));

    let html = '';
    if (pinned.length) {
      html += '<div class="focus3-label">★ FOCUS 3</div>';
      html += pinned.map(t => renderTaskFloatingRow(t, today, 'home')).join('');
      if (others.length) html += '<div class="focus3-label focus3-label-dim">OTHER TASKS</div>';
    }
    html += others.map(t => renderTaskFloatingRow(t, today, 'home')).join('');

    // Only touch the DOM when the markup actually changed
    if (listEl.dataset.sig !== html) {
      listEl.dataset.sig = html;
      listEl.innerHTML = html;
      attachTaskRowListeners(listEl);
    }
  }

  /* ========================================================================
     SCREEN 2: WEEK BOARD (HORIZONTAL TIMELINE LANES)
     ======================================================================== */
  function renderWeekBoardScreen() {
    const container = document.getElementById('week-board-lanes-container');
    const rangeLabel = document.getElementById('week-timeline-range-label');
    if (!container) return;

    const startDate = State.getWeekTimelineStart();
    const days = Dates.getMultiDayWindow(startDate, 7);

    if (rangeLabel) {
      const startFmt = Dates.formatDisplayDate(days[0].dateStr, 'short');
      const endFmt = Dates.formatDisplayDate(days[6].dateStr, 'short');
      rangeLabel.textContent = `${startFmt} – ${endFmt}`;
    }

    let lanesHtml = '';
    days.forEach(day => {
      const tasks = Tasks.getTasksForDate(day.dateStr, false);
      const stats = Tasks.getDailyStats(day.dateStr);

      lanesHtml += `
        <div class="week-timeline-lane ${day.isToday ? 'is-today-lane' : ''}" data-date="${day.dateStr}">
          <div class="lane-header">
            <div class="lane-header-left">
              <span class="lane-day-name">${day.dayName}</span>
              <span class="lane-date-num">${day.dayNumber} ${day.monthShort}</span>
              ${day.isToday ? '<span class="today-tag-chip">TODAY</span>' : ''}
            </div>
            <div class="lane-header-right">
              <span class="lane-completion-badge ${stats.percent === 100 ? 'complete' : ''}">${stats.percent}% (${stats.done}/${stats.total})</span>
              <button type="button" class="lane-quick-add-btn" data-date="${day.dateStr}" title="Add task to this day" aria-label="Add task">+</button>
            </div>
          </div>

          <div class="lane-tasks-dropzone" data-date="${day.dateStr}">
            ${tasks.map(t => renderTaskFloatingRow(t, day.dateStr, 'week')).join('')}
            ${tasks.length === 0 ? '<div class="lane-empty-placeholder">No directives scheduled</div>' : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = lanesHtml;
    attachTaskRowListeners(container);

    // Lane quick-add buttons
    container.querySelectorAll('.lane-quick-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dStr = btn.getAttribute('data-date');
        openTaskEditModal('', dStr);
      });
    });
  }

  /* ========================================================================
     SCREEN 3: CUSTOM LISTS (rename, hide, reorder)
     ======================================================================== */
  function renderCustomListsScreen() {
    const container = document.getElementById('custom-lists-screen-container');
    if (!container) return;

    const lists = State.getData().lists || [];

    if (lists.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-core-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <h4>No custom lists created yet. Tap + to create your first list.</h4>
          <p>Organize non-date ideas, long-term roadmaps, equipment logs, or grocery backlogs.</p>
          <button type="button" class="nexus-btn nexus-btn-primary" id="btn-create-first-list" style="margin-top: 14px;">+ CREATE YOUR FIRST LIST</button>
        </div>
      `;
      const btn = container.querySelector('#btn-create-first-list');
      if (btn) btn.addEventListener('click', promptCreateNewList);
      return;
    }

    const visible = lists.filter(l => !l.hidden);
    const hidden = lists.filter(l => l.hidden);
    let html = '';

    if (visible.length === 0) {
      html += '<div class="empty-state-card"><h4>All lists are hidden.</h4><p>Use the buttons below to show a list again.</p></div>';
    } else {
      html += '<div class="custom-lists-deck-grid">';
      visible.forEach((list, vIdx) => {
        const completed = list.items.filter(i => i.done).length;
        const total = list.items.length;
        html += `
          <div class="custom-list-card" data-list-id="${list.id}">
            <div class="list-card-header">
              <div class="list-title-wrap">
                <h3 class="list-title">${escapeHTML(list.name)}</h3>
                <span class="list-counter">${completed}/${total}</span>
              </div>
              <div class="list-tools">
                <button type="button" class="list-tool-btn list-move-btn" data-list-id="${list.id}" data-dir="-1" ${vIdx === 0 ? 'disabled' : ''} title="Move earlier" aria-label="Move list earlier">◀</button>
                <button type="button" class="list-tool-btn list-move-btn" data-list-id="${list.id}" data-dir="1" ${vIdx === visible.length - 1 ? 'disabled' : ''} title="Move later" aria-label="Move list later">▶</button>
                <button type="button" class="list-tool-btn list-rename-btn" data-list-id="${list.id}" title="Rename list" aria-label="Rename list">✎</button>
                <button type="button" class="list-tool-btn list-hide-btn" data-list-id="${list.id}" title="Hide list" aria-label="Hide list">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                </button>
                <button type="button" class="list-del-btn" data-list-id="${list.id}" title="Delete list" aria-label="Delete list">×</button>
              </div>
            </div>

            <div class="list-items-body">
              ${list.items.map(item => `
                <div class="custom-list-row ${item.done ? 'is-done' : ''}" data-item-id="${item.id}">
                  <button type="button" class="list-row-check ${item.done ? 'checked' : ''}" data-list-id="${list.id}" data-item-id="${item.id}" aria-label="Toggle">
                    <span class="check-dot"></span>
                  </button>
                  <span class="list-row-text">${escapeHTML(item.text)}</span>
                  <div class="list-row-actions">
                    <button type="button" class="list-row-promote-btn" data-list-id="${list.id}" data-item-id="${item.id}" title="Promote to Today's Task" aria-label="Promote">→</button>
                    <button type="button" class="list-row-delete-btn" data-list-id="${list.id}" data-item-id="${item.id}" title="Remove item" aria-label="Delete">×</button>
                  </div>
                </div>`).join('')}
              ${list.items.length === 0 ? '<div class="empty-list-lane">List is empty</div>' : ''}
            </div>

            <form class="add-custom-item-form" data-list-id="${list.id}">
              <input type="text" class="add-custom-item-input" placeholder="+ Add item..." aria-label="Add item to ${escapeHTML(list.name)}">
              <button type="submit" class="add-custom-item-submit" title="Add item" aria-label="Add item">+</button>
            </form>
          </div>`;
      });
      html += '</div>';
    }

    if (hidden.length) {
      html += `<div class="hidden-lists-row"><span>HIDDEN LISTS:</span>${hidden.map(l =>
        `<button type="button" class="nexus-btn nexus-btn-xs nexus-btn-secondary list-show-btn" data-list-id="${l.id}">SHOW ${escapeHTML(l.name)}</button>`).join('')}</div>`;
    }

    container.innerHTML = html;
    attachCustomListsDeckListeners(container);
  }

  async function promptCreateNewList() {
    const name = await window.NexusApp.Dialog.prompt('Give the new list a name (for example Ideas or Groceries).', {
      title: 'NEW LIST', placeholder: 'List name', okLabel: 'CREATE'
    });
    if (name && name.trim()) {
      State.getData().lists.push({
        id: window.NexusApp.Storage.generateUUID(),
        name: name.trim(),
        hidden: false,
        items: []
      });
      State.commit('listCreate');
      showToast(`Created list "${name.trim()}"`);
    }
  }

  function attachCustomListsDeckListeners(container) {
    const findList = (id) => (State.getData().lists || []).find(l => l.id === id);

    // Checkbox toggle
    container.querySelectorAll('.list-row-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = findList(btn.getAttribute('data-list-id'));
        const item = list && list.items.find(i => i.id === btn.getAttribute('data-item-id'));
        if (item) {
          item.done = !item.done;
          if (Audio) Audio.click();
          State.commit('listItemToggle');
        }
      });
    });

    // Add item
    container.querySelectorAll('.add-custom-item-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const list = findList(form.getAttribute('data-list-id'));
        const input = form.querySelector('.add-custom-item-input');
        if (list && input && input.value.trim()) {
          list.items.push({
            id: window.NexusApp.Storage.generateUUID(),
            text: input.value.trim(),
            done: false
          });
          input.value = '';
          if (Audio) Audio.click();
          State.commit('listItemAdd');
        }
      });
    });

    // Promote item to Today
    container.querySelectorAll('.list-row-promote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = findList(btn.getAttribute('data-list-id'));
        const item = list && list.items.find(i => i.id === btn.getAttribute('data-item-id'));
        if (item) {
          Tasks.addTask({ title: item.text, date: Dates.getTodayStr(), priority: 'high', tag: 'work' });
          item.done = true;
          showToast(`Promoted to Today: "${item.text}"`);
        }
      });
    });

    // Delete item
    container.querySelectorAll('.list-row-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = findList(btn.getAttribute('data-list-id'));
        if (!list) return;
        const idx = list.items.findIndex(i => i.id === btn.getAttribute('data-item-id'));
        if (idx !== -1) {
          list.items.splice(idx, 1);
          State.commit('listItemDelete');
        }
      });
    });

    // Delete list
    container.querySelectorAll('.list-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-list-id');
        const ok = await window.NexusApp.Dialog.confirm('Delete this list and all of its items?', {
          title: 'DELETE LIST', okLabel: 'DELETE', danger: true
        });
        if (!ok) return;
        const all = State.getData().lists;
        const idx = all.findIndex(l => l.id === id);
        if (idx !== -1) {
          all.splice(idx, 1);
          State.commit('listDelete');
        }
      });
    });

    // Rename
    container.querySelectorAll('.list-rename-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const list = findList(btn.getAttribute('data-list-id'));
        if (!list) return;
        const name = await window.NexusApp.Dialog.prompt('Rename this list.', {
          title: 'RENAME LIST', value: list.name, okLabel: 'SAVE'
        });
        if (name && name.trim()) {
          list.name = name.trim();
          State.commit('listRename');
        }
      });
    });

    // Hide / show
    container.querySelectorAll('.list-hide-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = findList(btn.getAttribute('data-list-id'));
        if (list) {
          list.hidden = true;
          State.commit('listHide');
          showToast(`Hidden "${list.name}". Use SHOW below to bring it back.`);
        }
      });
    });
    container.querySelectorAll('.list-show-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = findList(btn.getAttribute('data-list-id'));
        if (list) {
          list.hidden = false;
          State.commit('listShow');
        }
      });
    });

    // Reorder (skips over hidden lists)
    container.querySelectorAll('.list-move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const all = State.getData().lists;
        const idx = all.findIndex(l => l.id === btn.getAttribute('data-list-id'));
        const dir = Number(btn.getAttribute('data-dir'));
        let j = idx + dir;
        while (j >= 0 && j < all.length && all[j].hidden) j += dir;
        if (idx < 0 || j < 0 || j >= all.length) return;
        const tmp = all[idx]; all[idx] = all[j]; all[j] = tmp;
        State.commit('listReorder');
      });
    });
  }

  /* ========================================================================
     SCREEN 4: STATS & TELEMETRY
     ======================================================================== */
  function renderStatsScreen() {
    window.NexusApp.Charts.renderWeeklyVelocityBars('telemetry-barchart-container');
    window.NexusApp.Charts.renderHeatmap('telemetry-heatmap-container');

    const metrics = window.NexusApp.Charts.calculateMetrics();
    const streakEl = document.getElementById('stat-cur-streak');
    const bestStreakEl = document.getElementById('stat-best-streak');
    const rateEl = document.getElementById('stat-overall-rate');
    const bestDayEl = document.getElementById('stat-best-day');

    if (streakEl) streakEl.textContent = `${metrics.currentStreak} DAYS`;
    if (bestStreakEl) bestStreakEl.textContent = `${metrics.bestStreak} DAYS`;
    if (rateEl) rateEl.textContent = `${metrics.overallRate}%`;
    if (bestDayEl) bestDayEl.textContent = metrics.mostProductiveDay;
  }

  /* ========================================================================
     FLOATING TASK ROW COMPONENT
     ======================================================================== */
  function renderTaskFloatingRow(task, dateStr, context = 'home') {
    const isRecurring = Boolean(task.isRecurringInstance || task.recurringId);
    const subtaskStats = Tasks.getSubtaskStats(task);
    const settings = State.getSettings();
    const formattedTime = task.time ? Dates.formatTime(task.time, settings.timeFormat) : '';
    const pinned = Boolean(window.NexusApp.Extras && window.NexusApp.Extras.isPinned(task.id, dateStr));

    return `
      <div class="nexus-floating-task priority-${task.priority || 'medium'} ${task.done ? 'is-completed' : ''} ${pinned ? 'is-pinned' : ''}"
           data-task-id="${task.id}" data-date="${dateStr}" draggable="true" tabindex="0">

        <!-- Glowing circular check node -->
        <button type="button" class="check-node ${task.done ? 'checked' : ''}"
                data-task-id="${task.id}" data-date="${dateStr}"
                aria-label="Toggle complete: ${escapeHTML(task.title)}">
          <svg viewBox="0 0 20 20" class="check-node-svg">
            <polyline points="4 10 8 14 16 6"></polyline>
          </svg>
        </button>

        <!-- Main Task Text and Meta Chips -->
        <div class="task-info-body" data-task-id="${task.id}">
          <div class="task-title-line">
            <span class="task-title-text">${escapeHTML(task.title)}</span>
          </div>

          <div class="task-chips-row">
            ${formattedTime ? `
              <span class="task-chip chip-time">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${formattedTime}
              </span>
            ` : ''}

            <span class="task-chip chip-priority priority-${task.priority || 'medium'}">${(task.priority || 'MED').toUpperCase()}</span>

            ${task.tag ? `<span class="task-chip chip-tag">${escapeHTML(task.tag)}</span>` : ''}

            ${isRecurring ? `
              <span class="task-chip chip-recurring" title="Recurring Routine">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                AUTO
              </span>
            ` : ''}

            ${task.carriedFrom ? `
              <span class="task-chip chip-carried" title="Carried over from ${task.carriedFrom}">
                from ${task.carriedFrom.substring(5)}
              </span>
            ` : ''}

            ${subtaskStats.total > 0 ? `
              <span class="task-chip chip-subtasks ${subtaskStats.completed === subtaskStats.total ? 'all-done' : ''}">
                ✓ ${subtaskStats.completed}/${subtaskStats.total}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Task Action Tools (Hover on Desktop / always visible on touch) -->
        <div class="task-row-tools">
          <button type="button" class="row-tool-btn pin-btn ${pinned ? 'is-on' : ''}" data-task-id="${task.id}" data-date="${dateStr}" aria-pressed="${pinned}" title="Pin to Focus 3" aria-label="Pin to Focus 3">★</button>
          ${!isRecurring ? `<button type="button" class="row-tool-btn move-btn" data-task-id="${task.id}" data-date="${dateStr}" title="Move to another day" aria-label="Move to another day">⇄</button>` : ''}
          <button type="button" class="row-tool-btn timer-btn" data-task-id="${task.id}" title="Focus on this directive" aria-label="Timer">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </button>
          <button type="button" class="row-tool-btn edit-btn" data-task-id="${task.id}" data-date="${dateStr}" title="Edit directive" aria-label="Edit">✎</button>
          <button type="button" class="row-tool-btn delete-btn" data-task-id="${task.id}" data-date="${dateStr}" title="Remove directive" aria-label="Delete">×</button>
        </div>
      </div>
    `;
  }

  function attachTaskRowListeners(container) {
    // Check node click
    container.querySelectorAll('.check-node').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = node.getAttribute('data-task-id');
        const dateStr = node.getAttribute('data-date');
        if (taskId && dateStr) {
          const rect = node.getBoundingClientRect();
          triggerParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
          Tasks.toggleTaskDone(taskId, dateStr);
        }
      });
    });

    // Body click -> edit
    container.querySelectorAll('.task-info-body').forEach(body => {
      body.addEventListener('click', () => {
        const taskId = body.getAttribute('data-task-id');
        if (taskId) openTaskEditModal(taskId);
      });
    });

    // Edit button
    container.querySelectorAll('.row-tool-btn.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        if (taskId) openTaskEditModal(taskId);
      });
    });

    // Timer button
    container.querySelectorAll('.row-tool-btn.timer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        if (taskId && window.NexusApp.Timer) {
          window.NexusApp.Timer.bindTask(taskId);
          window.NexusApp.Hub.openSlidePanel('panel-timer');
        }
      });
    });

    // Delete button
    container.querySelectorAll('.row-tool-btn.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const dateStr = btn.getAttribute('data-date');
        if (taskId && dateStr) {
          Tasks.deleteTask(taskId, dateStr);
        }
      });
    });

    // Pin to Focus 3
    container.querySelectorAll('.row-tool-btn.pin-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ex = window.NexusApp.Extras;
        if (ex && ex.togglePin(btn.getAttribute('data-task-id'), btn.getAttribute('data-date'))) {
          renderActiveScreen();
        }
      });
    });

    // Move to another day (works on touch, where drag and drop does not)
    container.querySelectorAll('.row-tool-btn.move-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        const from = btn.getAttribute('data-date');
        const target = await window.NexusApp.Dialog.prompt('Move this task to which day?', {
          title: 'MOVE TASK', type: 'date', value: Dates.addDays(from, 1), okLabel: 'MOVE'
        });
        if (target && target !== from) {
          Tasks.moveTaskToDate(id, target);
          showToast('Moved to ' + Dates.formatDisplayDate(target, 'short'));
        }
      });
    });
  }

  /* ========================================================================
     PANEL RENDERERS: TRANSFER & RECURRING
     ======================================================================== */
  function renderTransferPanel() {
    const modeSelect = document.getElementById('transfer-mode-select');
    const specificWrap = document.getElementById('transfer-specific-date-wrap');
    const specificDateInput = document.getElementById('transfer-source-date');
    const targetDateInput = document.getElementById('transfer-target-date');
    const previewList = document.getElementById('transfer-preview-list');
    const selectAllBtn = document.getElementById('transfer-select-all-btn');
    const executeBtn = document.getElementById('transfer-execute-btn');

    if (!modeSelect || !previewList) return;

    if (targetDateInput && !targetDateInput.value) {
      targetDateInput.value = Dates.getTodayStr();
    }
    if (specificDateInput && !specificDateInput.value) {
      specificDateInput.value = Dates.addDays(Dates.getTodayStr(), -1);
    }

    function refreshPreview() {
      const mode = modeSelect.value;
      if (specificWrap) specificWrap.style.display = mode === 'specific' ? 'block' : 'none';

      const eligible = window.NexusApp.Transfer.getEligibleTasks(mode, specificDateInput ? specificDateInput.value : '');

      if (eligible.length === 0) {
        previewList.innerHTML = '<div class="empty-state-notice">No pending directives found in this scope.</div>';
        if (executeBtn) executeBtn.disabled = true;
        return;
      }

      if (executeBtn) executeBtn.disabled = false;

      previewList.innerHTML = eligible.map(t => `
        <label class="transfer-row-item">
          <input type="checkbox" class="transfer-item-check" value="${t.id}" checked>
          <div class="transfer-item-text">
            <span class="transfer-title">${escapeHTML(t.title)}</span>
            <span class="transfer-meta">Date: ${Dates.formatDisplayDate(t.date)}</span>
          </div>
          <span class="task-chip chip-priority priority-${t.priority}">${(t.priority || 'MED').toUpperCase()}</span>
        </label>
      `).join('');
    }

    modeSelect.onchange = refreshPreview;
    if (specificDateInput) specificDateInput.onchange = refreshPreview;

    if (selectAllBtn) {
      selectAllBtn.onclick = () => {
        const checks = previewList.querySelectorAll('.transfer-item-check');
        const allChecked = Array.from(checks).every(c => c.checked);
        checks.forEach(c => c.checked = !allChecked);
        selectAllBtn.textContent = allChecked ? 'SELECT ALL' : 'DESELECT ALL';
      };
    }

    if (executeBtn) {
      executeBtn.onclick = async () => {
        const selectedChecks = previewList.querySelectorAll('.transfer-item-check:checked');
        const taskIds = Array.from(selectedChecks).map(c => c.value);
        const targetDate = targetDateInput.value || Dates.getTodayStr();
        const actionRadio = document.querySelector('input[name="transfer-action-type"]:checked');
        const actionType = actionRadio ? actionRadio.value : 'move';

        if (taskIds.length === 0) {
          await window.NexusApp.Dialog.alert('Select at least one task to transfer.', { title: 'NOTHING SELECTED' });
          return;
        }

        const res = window.NexusApp.Transfer.executeTransfer({ taskIds, targetDate, actionType });
        if (res.success) {
          window.NexusApp.Hub.closeSlidePanel('panel-transfer');
        } else {
          await window.NexusApp.Dialog.alert(res.message, { title: 'TRANSFER FAILED' });
        }
      };
    }

    refreshPreview();
  }

  // Streak + last 7 days for one recurring template
  function recurringHistory(tpl) {
    const Rec = window.NexusApp.Recurring;
    const today = Dates.getTodayStr();
    const doneMap = tpl.completions || {};
    const scheduledOn = (d) => Rec.getInstancesForDate(d).some(x => x.recurringId === tpl.id);

    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = Dates.addDays(today, -i);
      dots.push({ d, scheduled: scheduledOn(d), done: Boolean(doneMap[d]) });
    }

    let streak = 0;
    for (let i = 0; i < 120; i++) {
      const d = Dates.addDays(today, -i);
      if (!scheduledOn(d)) continue;      // days it does not run neither add nor break the streak
      if (doneMap[d]) streak++;
      else if (i === 0) continue;         // today is still in progress
      else break;
    }
    return { dots, streak };
  }

  function renderRecurringPanel() {
    const listEl = document.getElementById('recurring-templates-list');
    const form = document.getElementById('new-recurring-form');
    if (!listEl || !form) return;

    const Dialog = window.NexusApp.Dialog;
    const Rec = window.NexusApp.Recurring;
    const $ = (id) => document.getElementById(id);
    const templates = State.getData().recurring || [];

    const typeSel = $('rec-type-select');
    const weeklyWrap = $('rec-weekly-wrap');
    const monthlyWrap = $('rec-monthly-wrap');
    const editId = $('rec-edit-id');
    const submitBtn = $('rec-submit-btn');
    const cancelBtn = $('rec-cancel-edit-btn');
    const startInput = $('rec-start-date');

    function syncType() {
      weeklyWrap.style.display = typeSel.value === 'weekly' ? 'block' : 'none';
      monthlyWrap.style.display = typeSel.value === 'monthly' ? 'block' : 'none';
    }
    function resetForm() {
      form.reset();
      editId.value = '';
      submitBtn.textContent = '+ ACTIVATE ROUTINE';
      cancelBtn.style.display = 'none';
      startInput.value = Dates.getTodayStr();
      syncType();
    }
    function startEdit(tpl) {
      editId.value = tpl.id;
      $('rec-title-input').value = tpl.title || '';
      typeSel.value = tpl.repeat.type || 'daily';
      $('rec-time-input').value = tpl.time || '';
      $('rec-priority-select').value = tpl.priority || 'medium';
      $('rec-tag-select').value = tpl.tag || 'work';
      startInput.value = tpl.startDate || Dates.getTodayStr();
      $('rec-end-date').value = tpl.endDate || '';
      $('rec-month-day').value = tpl.repeat.dayOfMonth || 1;
      const days = tpl.repeat.days || [];
      form.querySelectorAll('#rec-day-picker input').forEach(cb => {
        cb.checked = tpl.repeat.type === 'weekly' && days.includes(Number(cb.value));
      });
      submitBtn.textContent = 'SAVE CHANGES';
      cancelBtn.style.display = 'inline-flex';
      syncType();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    typeSel.onchange = syncType;
    cancelBtn.onclick = resetForm;
    if (!startInput.value) startInput.value = Dates.getTodayStr();
    syncType();

    if (templates.length === 0) {
      listEl.innerHTML = '<div class="empty-state-notice">No recurring routines established yet. Configure your first one below.</div>';
    } else {
      listEl.innerHTML = templates.map(tpl => {
        const rep = tpl.repeat || { type: 'daily' };
        let repeatDesc = 'Daily';
        if (rep.type === 'weekdays') repeatDesc = 'Mon–Fri';
        else if (rep.type === 'weekly') repeatDesc = `Weekly on ${(rep.days || []).map(d => Dates.DAY_NAMES_SHORT[d]).join(', ')}`;
        else if (rep.type === 'monthly') repeatDesc = `Monthly on day ${rep.dayOfMonth}`;
        const hist = recurringHistory(tpl);

        return `
          <div class="recurring-template-card ${tpl.paused ? 'is-paused' : ''}">
            <div class="rec-top-row">
              <span class="rec-title">${escapeHTML(tpl.title)}</span>
              <span class="rec-pill ${tpl.paused ? 'paused' : 'active'}">${tpl.paused ? 'PAUSED' : 'ACTIVE'}</span>
            </div>
            <div class="rec-details">
              <span>Repeat: ${repeatDesc}</span>
              ${tpl.time ? `<span>Time: ${tpl.time}</span>` : ''}
              <span>Start: ${tpl.startDate}</span>
            </div>
            <div class="rec-streak">
              <span class="rec-flame" title="Current streak">🔥 ${hist.streak}</span>
              <span class="rec-dots" aria-label="Last 7 days">${hist.dots.map(d =>
                `<i class="rec-dot ${!d.scheduled ? 'off' : (d.done ? 'done' : 'miss')}" title="${d.d}"></i>`).join('')}</span>
            </div>
            <div class="rec-card-actions">
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-secondary rec-edit-btn" data-id="${tpl.id}">EDIT</button>
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-secondary rec-pause-btn" data-id="${tpl.id}">${tpl.paused ? 'RESUME' : 'PAUSE'}</button>
              <button type="button" class="nexus-btn nexus-btn-xs nexus-btn-danger rec-del-btn" data-id="${tpl.id}">DELETE</button>
            </div>
          </div>`;
      }).join('');

      listEl.querySelectorAll('.rec-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = templates.find(t => t.id === btn.getAttribute('data-id'));
          if (tpl) startEdit(tpl);
        });
      });
      listEl.querySelectorAll('.rec-pause-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Rec.togglePauseTemplate(btn.getAttribute('data-id'));
          renderRecurringPanel();
        });
      });
      listEl.querySelectorAll('.rec-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await Dialog.confirm('Delete this recurring routine? Past completions are removed with it.', {
            title: 'DELETE ROUTINE', okLabel: 'DELETE', danger: true
          });
          if (ok) {
            Rec.deleteTemplate(btn.getAttribute('data-id'));
            if (editId.value === btn.getAttribute('data-id')) resetForm();
            renderRecurringPanel();
          }
        });
      });
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const title = $('rec-title-input').value.trim();
      const type = typeSel.value;
      const time = $('rec-time-input').value;
      const priority = $('rec-priority-select').value;
      const tag = $('rec-tag-select').value;
      const startDate = startInput.value || Dates.getTodayStr();
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

      if (editId.value) {
        const tpl = (State.getData().recurring || []).find(r => r.id === editId.value);
        if (tpl) {
          Object.assign(tpl, { title, time, priority, tag, startDate, endDate, repeat });
          State.commit('recurringUpdate');
          showToast(`Recurring routine "${title}" updated`);
        }
      } else {
        Rec.createTemplate({ title, time, priority, tag, startDate, endDate, repeat });
        showToast(`Recurring routine "${title}" active`);
      }
      resetForm();
      renderRecurringPanel();
    };
  }

  /* ========================================================================
     OVERDUE BANNER & TASK EDIT MODAL
     ======================================================================== */
  function checkOverdueBanner() {
    const banner = document.getElementById('overdue-alert-strip');
    const badge = document.getElementById('overdue-count-indicator');
    const moveBtn = document.getElementById('overdue-resolve-action-btn');
    if (!banner || !badge || !moveBtn) return;

    const overdue = Tasks.getOverdueTasks();
    if (overdue.length > 0) {
      badge.textContent = overdue.length;
      banner.style.display = 'flex';
      moveBtn.onclick = () => {
        Tasks.moveAllOverdueToToday();
        banner.style.display = 'none';
      };
    } else {
      banner.style.display = 'none';
    }
  }

  function setupTaskEditModal() {
    const form = document.getElementById('task-edit-dialog-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveTaskEditDialog();
    });

    const subtaskInput = document.getElementById('modal-subtask-input');
    const subtaskBtn = document.getElementById('modal-subtask-add-btn');
    if (subtaskInput && subtaskBtn) {
      subtaskBtn.addEventListener('click', () => {
        const text = subtaskInput.value.trim();
        const taskId = document.getElementById('modal-task-id').value;
        if (text && taskId) {
          Tasks.addSubtask(taskId, text);
          subtaskInput.value = '';
          renderModalSubtasks(taskId);
        }
      });
      subtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          subtaskBtn.click();
        }
      });
    }

    // Modal close
    document.querySelectorAll('.task-dialog-close').forEach(b => {
      b.addEventListener('click', closeTaskEditModal);
    });
  }

  function openTaskEditModal(taskId = '', defaultDate = '') {
    const modal = document.getElementById('task-edit-dialog-modal');
    if (!modal) return;

    const stateData = State.getData();
    let task = null;

    if (taskId) {
      task = (stateData.tasks || []).find(t => t.id === taskId);
      if (!task && taskId.startsWith('rec_')) {
        const activeDate = State.getSelectedDate();
        task = window.NexusApp.Recurring.getInstancesForDate(activeDate).find(i => i.id === taskId);
      }
    }

    const titleInput = document.getElementById('modal-task-title');
    const dateInput = document.getElementById('modal-task-date');
    const timeInput = document.getElementById('modal-task-time');
    const prioritySelect = document.getElementById('modal-task-priority');
    const tagSelect = document.getElementById('modal-task-tag');
    const notesInput = document.getElementById('modal-task-notes');
    const idInput = document.getElementById('modal-task-id');
    const modalHeaderTitle = document.getElementById('task-dialog-header-title');

    idInput.value = taskId || '';
    titleInput.value = task ? task.title : '';
    dateInput.value = task ? task.date : (defaultDate || State.getSelectedDate() || Dates.getTodayStr());
    timeInput.value = task ? (task.time || '') : '';
    prioritySelect.value = task ? (task.priority || 'medium') : 'medium';
    tagSelect.value = task ? (task.tag || 'work') : 'work';
    notesInput.value = task ? (task.notes || '') : '';

    if (modalHeaderTitle) {
      modalHeaderTitle.textContent = task ? 'DIRECTIVE PARAMETERS' : 'INITIALIZE DIRECTIVE';
    }

    renderModalSubtasks(taskId);

    modal.classList.add('active');
    setTimeout(() => titleInput.focus(), 80);
  }

  function closeTaskEditModal() {
    const modal = document.getElementById('task-edit-dialog-modal');
    if (modal) modal.classList.remove('active');
  }

  function renderModalSubtasks(taskId) {
    const listEl = document.getElementById('modal-subtasks-checklist');
    if (!listEl) return;

    if (!taskId) {
      listEl.innerHTML = '<div class="subtask-placeholder">Save directive first to add checkpoints.</div>';
      return;
    }

    const stateData = State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    if (!task || !task.subtasks || task.subtasks.length === 0) {
      listEl.innerHTML = '<div class="subtask-placeholder">No checkpoints added.</div>';
      return;
    }

    listEl.innerHTML = task.subtasks.map(st => `
      <div class="subtask-row ${st.done ? 'done' : ''}">
        <input type="checkbox" class="subtask-checkbox" ${st.done ? 'checked' : ''} data-task-id="${task.id}" data-subtask-id="${st.id}" aria-label="Toggle subtask">
        <span class="subtask-label">${escapeHTML(st.text)}</span>
        <button type="button" class="subtask-remove-btn" data-task-id="${task.id}" data-subtask-id="${st.id}" aria-label="Remove subtask">×</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.subtask-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        Tasks.toggleSubtask(cb.getAttribute('data-task-id'), cb.getAttribute('data-subtask-id'));
        renderModalSubtasks(taskId);
      });
    });

    listEl.querySelectorAll('.subtask-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Tasks.deleteSubtask(btn.getAttribute('data-task-id'), btn.getAttribute('data-subtask-id'));
        renderModalSubtasks(taskId);
      });
    });
  }

  async function saveTaskEditDialog() {
    const taskId = document.getElementById('modal-task-id').value;
    const title = document.getElementById('modal-task-title').value.trim();
    const date = document.getElementById('modal-task-date').value;
    const time = document.getElementById('modal-task-time').value;
    const priority = document.getElementById('modal-task-priority').value;
    const tag = document.getElementById('modal-task-tag').value;
    const notes = document.getElementById('modal-task-notes').value.trim();

    if (!title) return;

    if (taskId && taskId.startsWith('rec_')) {
      const activeDate = State.getSelectedDate();
      const inst = window.NexusApp.Recurring.getInstancesForDate(activeDate).find(i => i.id === taskId);
      if (inst && inst.recurringId) {
        const choice = await window.NexusApp.Dialog.choice('This is a recurring task. Apply your changes to:', {
          title: 'RECURRING TASK',
          options: [
            { label: 'THIS DAY ONLY', value: 'day' },
            { label: 'ALL FUTURE DAYS', value: 'all', primary: true },
            { label: 'CANCEL', value: null }
          ]
        });
        if (!choice) return;                       // cancelled, keep the dialog open
        if (choice === 'all') {
          window.NexusApp.Recurring.updateTemplate(inst.recurringId, { title, time, priority, tag, notes });
        } else {
          window.NexusApp.Recurring.deleteInstanceChoice(inst.recurringId, activeDate, 'thisDay');
          Tasks.addTask({ title, date, time, priority, tag, notes });
        }
      }
    } else if (taskId) {
      Tasks.updateTask(taskId, { title, date, time, priority, tag, notes });
    } else {
      Tasks.addTask({ title, date, time, priority, tag, notes });
    }

    closeTaskEditModal();
  }

  async function promptRecurringDeleteChoice(recurringId, dateStr) {
    const choice = await window.NexusApp.Dialog.choice('Delete this recurring routine:', {
      title: 'RECURRING TASK',
      options: [
        { label: 'THIS DAY ONLY', value: 'thisDay' },
        { label: 'ALL FUTURE DAYS', value: 'allFuture', danger: true },
        { label: 'CANCEL', value: null }
      ]
    });
    if (choice === 'thisDay') {
      window.NexusApp.Recurring.deleteInstanceChoice(recurringId, dateStr, 'thisDay');
      showToast('Routine skipped for this date');
    } else if (choice === 'allFuture') {
      window.NexusApp.Recurring.deleteInstanceChoice(recurringId, dateStr, 'allFuture');
      showToast('Routine ended for all future dates');
    }
  }

  /* ========================================================================
     INTERACTION SYSTEMS: DRAG & DROP, TOUCH GESTURES, PARTICLES & TOAST
     ======================================================================== */
  function setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      const taskRow = e.target.closest('.nexus-floating-task');
      if (taskRow) {
        draggedTaskId = taskRow.getAttribute('data-task-id');
        draggedSourceDate = taskRow.getAttribute('data-date');
        taskRow.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', draggedTaskId);
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      const taskRow = e.target.closest('.nexus-floating-task');
      if (taskRow) taskRow.classList.remove('is-dragging');
      draggedTaskId = null;
      draggedSourceDate = null;
      document.querySelectorAll('.lane-tasks-dropzone').forEach(dz => dz.classList.remove('drag-over'));
    });

    document.addEventListener('dragover', (e) => {
      const dz = e.target.closest('.lane-tasks-dropzone');
      if (dz && draggedTaskId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dz.classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      const dz = e.target.closest('.lane-tasks-dropzone');
      if (dz && !dz.contains(e.relatedTarget)) {
        dz.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      const dz = e.target.closest('.lane-tasks-dropzone');
      if (dz && draggedTaskId) {
        e.preventDefault();
        dz.classList.remove('drag-over');
        const targetDate = dz.getAttribute('data-date');
        if (targetDate && targetDate !== draggedSourceDate) {
          Tasks.moveTaskToDate(draggedTaskId, targetDate);
        }
      }
    });
  }

  // Swipe that does not fight vertical scrolling: right = complete, left = delete (with Undo)
  function setupTouchGestures() {
    let row = null, startX = 0, startY = 0, locked = false;

    function reset() {
      if (!row) return;
      row.style.transform = '';
      row.classList.remove('is-swiping', 'swipe-right', 'swipe-left');
    }

    document.addEventListener('touchstart', (e) => {
      const r = e.target.closest('.nexus-floating-task');
      if (!r || e.target.closest('button, input, select, textarea, a')) { row = null; return; }
      row = r; locked = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!row) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!locked) {
        // vertical scroll wins unless the gesture is clearly horizontal
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { reset(); row = null; return; }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) locked = true; else return;
      }
      row.classList.add('is-swiping');
      row.style.transform = `translateX(${Math.max(-120, Math.min(120, dx))}px)`;
      row.classList.toggle('swipe-right', dx > 0);
      row.classList.toggle('swipe-left', dx < 0);
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!row) return;
      const dx = e.changedTouches[0].clientX - startX;
      const r = row, wasLocked = locked;
      const id = r.getAttribute('data-task-id'), date = r.getAttribute('data-date');
      reset(); row = null; locked = false;
      if (!wasLocked || Math.abs(dx) < 90) return;

      if (dx > 0) {
        Tasks.toggleTaskDone(id, date);
      } else {
        Tasks.deleteTask(id, date);
        if (!String(id).startsWith('rec_')) showToast('Task deleted', 'UNDO', () => Tasks.undoLastAction());
      }
    }, { passive: true });

    document.addEventListener('touchcancel', () => { reset(); row = null; locked = false; }, { passive: true });
  }

  function triggerParticleBurst(x, y) {
    const s = State.getSettings();
    if (!s.animationsEnabled) return;

    const count = 16;
    const colors = ['#22d3ee', '#a855f7', '#ec4899', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'nexus-particle-spark';
      document.body.appendChild(p);

      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.backgroundColor = color;
      p.style.boxShadow = `0 0 8px ${color}`;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;

      const angle = Math.random() * Math.PI * 2;
      const velocity = 35 + Math.random() * 55;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;

      p.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
      ], {
        duration: 350 + Math.random() * 150,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }).onfinish = () => p.remove();
    }
  }

  function showToast(message, actionText, actionCallback) {
    const toast = document.getElementById('nexus-toast');
    const msgEl = document.getElementById('toast-text');
    const actBtn = document.getElementById('toast-undo-btn');

    if (!toast || !msgEl || !actBtn) return;
    if (toastTimer) clearTimeout(toastTimer);

    msgEl.textContent = message;

    if (actionText && typeof actionCallback === 'function') {
      actBtn.textContent = actionText;
      actBtn.style.display = 'inline-block';
      actBtn.onclick = () => {
        actionCallback();
        toast.classList.remove('visible');
      };
    } else {
      actBtn.style.display = 'none';
      actBtn.onclick = null;
    }

    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
  }

  function setupScreenRouter() {
    // Top bar home brand click
    const brand = document.getElementById('top-bar-brand');
    if (brand) {
      brand.addEventListener('click', () => {
        State.setCurrentScreen('home');
      });
    }

    // Quick-add field on Home (understands "gym tomorrow 6pm high #fitness")
    const quickForm = document.getElementById('home-quick-add-form');
    if (quickForm) {
      quickForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('home-quick-add-input');
        const timeInput = document.getElementById('home-quick-add-time');
        const prioritySelect = document.getElementById('home-quick-add-priority');

        if (input && input.value.trim()) {
          const ex = window.NexusApp.Extras;
          const p = ex ? ex.parseQuickAdd(input.value) : { title: input.value.trim() };
          const today = Dates.getTodayStr();
          const task = {
            title: p.title,
            date: p.date || today,
            time: p.time || (timeInput ? timeInput.value : ''),
            priority: p.priority || (prioritySelect ? prioritySelect.value : 'medium')
          };
          if (p.tag) task.tag = p.tag;
          Tasks.addTask(task);
          if (task.date !== today) showToast('Added to ' + Dates.formatDisplayDate(task.date, 'short'));

          input.value = '';
          input.dispatchEvent(new Event('input'));          // clears the preview chips
          if (timeInput) { timeInput.value = ''; timeInput.dispatchEvent(new Event('input')); }
        }
      });
    }

    // Week timeline navigation
    const prevWeekBtn = document.getElementById('week-timeline-prev-btn');
    const nextWeekBtn = document.getElementById('week-timeline-next-btn');
    const todayWeekBtn = document.getElementById('week-timeline-today-btn');

    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => State.shiftWeekTimeline(-7));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => State.shiftWeekTimeline(7));
    if (todayWeekBtn) todayWeekBtn.addEventListener('click', () => State.resetWeekTimelineToToday());

    // Search filter bar on Home
    const searchInput = document.getElementById('home-search-input');
    const priorityFilter = document.getElementById('home-filter-priority');
    const statusFilter = document.getElementById('home-filter-status');

    if (searchInput) searchInput.addEventListener('input', (e) => State.setFilter('search', e.target.value));
    if (priorityFilter) priorityFilter.addEventListener('change', (e) => State.setFilter('priority', e.target.value));
    if (statusFilter) statusFilter.addEventListener('change', (e) => State.setFilter('status', e.target.value));
  }

  function setupSettingsTabs() {
    const form = document.getElementById('settings-deck-form');
    if (!form) return;

    function populateSettingsForm() {
      const s = State.getSettings();
      const monikerInput = document.getElementById('set-profile-name');
      const accentSelect = document.getElementById('set-accent-color');
      const soundCheck = document.getElementById('set-sound-enabled');
      const animCheck = document.getElementById('set-anim-enabled');
      const timeSelect = document.getElementById('set-time-format');
      const weekSelect = document.getElementById('set-week-start');
      const hcCheck = document.getElementById('set-high-contrast');
      const hapCheck = document.getElementById('set-haptics');

      if (monikerInput) monikerInput.value = s.userName || 'Commander';
      if (accentSelect) accentSelect.value = s.accentColor || 'cyan';
      if (soundCheck) soundCheck.checked = Boolean(s.soundEnabled);
      if (animCheck) animCheck.checked = Boolean(s.animationsEnabled);
      if (timeSelect) timeSelect.value = s.timeFormat || '24';
      if (weekSelect) weekSelect.value = s.weekStart || 'mon';
      if (hcCheck) hcCheck.checked = Boolean(s.highContrast);
      if (hapCheck) hapCheck.checked = s.hapticsEnabled !== false;

      document.documentElement.setAttribute('data-theme', s.accentColor || 'cyan');
      document.documentElement.setAttribute('data-contrast', s.highContrast ? 'high' : 'normal');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const userName = document.getElementById('set-profile-name').value.trim() || 'Commander';
      const accentColor = document.getElementById('set-accent-color').value;
      const soundEnabled = document.getElementById('set-sound-enabled').checked;
      const animationsEnabled = document.getElementById('set-anim-enabled').checked;
      const timeFormat = document.getElementById('set-time-format').value;
      const weekStart = document.getElementById('set-week-start').value;
      const highContrast = document.getElementById('set-high-contrast').checked;
      const hapticsEnabled = document.getElementById('set-haptics').checked;

      State.updateSettings({ userName, accentColor, soundEnabled, animationsEnabled, timeFormat, weekStart, highContrast, hapticsEnabled });
      document.documentElement.setAttribute('data-theme', accentColor);
      document.documentElement.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
      window.NexusApp.Hub.closeSlidePanel('panel-settings');
      showToast('Settings saved, Commander.');
    });

    // Export JSON Backup
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.NexusApp.Storage.exportJSON(State.getData());
        showToast('Telemetry JSON backup downloaded');
      });
    }

    // Import JSON Backup
    const importBtn = document.getElementById('btn-import-backup');
    const importFile = document.getElementById('import-file-input');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const Dialog = window.NexusApp.Dialog;
          try {
            const mode = await Dialog.choice('How should this backup be added to your current data?', {
              title: 'IMPORT BACKUP',
              options: [
                { label: 'MERGE WITH CURRENT', value: 'merge', primary: true },
                { label: 'REPLACE EVERYTHING', value: 'replace', danger: true },
                { label: 'CANCEL', value: null }
              ]
            });
            if (!mode) return;
            const merged = window.NexusApp.Storage.importJSON(event.target.result, mode, State.getData());
            State.replaceData(merged);
            showToast('Backup successfully imported');
            window.NexusApp.Hub.closeSlidePanel('panel-settings');
          } catch (err) {
            await Dialog.alert('Failed to import backup: ' + err.message, { title: 'IMPORT FAILED' });
          }
        };
        reader.readAsText(file);
        importFile.value = '';
      });
    }

    // Reset Data
    const resetBtn = document.getElementById('btn-reset-database');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const Dialog = window.NexusApp.Dialog;
        const first = await Dialog.confirm('This erases all tasks, routines and lists from this browser.', {
          title: 'DANGER ZONE', okLabel: 'CONTINUE', danger: true
        });
        if (!first) return;
        const second = await Dialog.prompt('Type CONFIRM (capital letters) to wipe all data.', {
          title: 'FINAL CONFIRMATION', placeholder: 'CONFIRM', okLabel: 'WIPE DATA'
        });
        if (second === 'CONFIRM') {
          const fresh = window.NexusApp.Storage.resetAllData();
          State.replaceData(fresh);
          showToast('Database reset to clean state');
          window.NexusApp.Hub.closeSlidePanel('panel-settings');
        }
      });
    }

    populateSettingsForm();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    init,
    renderActiveScreen,
    renderHomeScreen,
    renderWeekBoardScreen,
    renderCustomListsScreen,
    renderStatsScreen,
    renderTransferPanel,
    renderRecurringPanel,
    renderTaskFloatingRow,
    attachTaskRowListeners,
    openTaskEditModal,
    closeTaskEditModal,
    promptCreateNewList,
    promptRecurringDeleteChoice,
    triggerParticleBurst,
    showToast,
    escapeHTML
  };
})();

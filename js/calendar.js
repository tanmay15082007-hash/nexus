/**
 * NEXUS - Tactical Calendar Panel Engine
 * Holographic 7-column month grid, task priority dots, completion glow & compact day summary
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Calendar = (function() {
  const Dates = window.NexusApp.Dates;

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let isInitialized = false;

  function init() {
    const activeDate = window.NexusApp.State.getSelectedDate() || Dates.getTodayStr();
    const d = Dates.strToDate(activeDate);
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();

    if (!isInitialized) {
      setupTouchSwipe();
      setupKeyboardNavigation();
      setupStateSubscription();
      isInitialized = true;
    }
  }

  function setupStateSubscription() {
    window.NexusApp.State.subscribe(() => {
      const panel = document.getElementById('panel-calendar');
      if (panel && panel.classList.contains('active')) {
        renderCalendar();
      }
    });
  }

  function setupTouchSwipe() {
    const panel = document.getElementById('panel-calendar');
    if (!panel) return;

    let touchStartX = 0;
    let touchStartY = 0;

    panel.addEventListener('touchstart', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
      }
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Swipe threshold: > 45px horizontal and 1.4x dominant over vertical
      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
        if (diffX < 0) {
          nextMonth(); // Swipe left -> Next month
        } else {
          prevMonth(); // Swipe right -> Previous month
        }
      }
    }, { passive: true });
  }

  function setupKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      const panel = document.getElementById('panel-calendar');
      if (!panel || !panel.classList.contains('active')) return;

      // Do not intercept if user is typing in form elements
      const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;
      if (document.querySelector('.nexus-dialog-modal.active')) return;

      const activeDate = window.NexusApp.State.getSelectedDate() || Dates.getTodayStr();

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const target = Dates.addDays(activeDate, -1);
          syncMonthToDate(target);
          selectDate(target);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const target = Dates.addDays(activeDate, 1);
          syncMonthToDate(target);
          selectDate(target);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const target = Dates.addDays(activeDate, -7);
          syncMonthToDate(target);
          selectDate(target);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const target = Dates.addDays(activeDate, 7);
          syncMonthToDate(target);
          selectDate(target);
          break;
        }
        case 'PageUp': {
          e.preventDefault();
          prevMonth();
          break;
        }
        case 'PageDown': {
          e.preventDefault();
          nextMonth();
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const addBtn = document.getElementById('cal-add-task-btn');
          if (addBtn) addBtn.click();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          if (window.NexusApp.Hub && window.NexusApp.Hub.closeSlidePanel) {
            window.NexusApp.Hub.closeSlidePanel('panel-calendar');
          }
          break;
        }
      }
    });
  }

  function syncMonthToDate(dateStr) {
    const d = Dates.strToDate(dateStr);
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      currentMonth = d.getMonth();
      currentYear = d.getFullYear();
    }
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    renderCalendar();
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    renderCalendar();
  }

  function jumpToToday() {
    const today = Dates.getTodayStr();
    const d = Dates.strToDate(today);
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();
    window.NexusApp.State.setSelectedDate(today);
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    renderCalendar();
  }

  function selectDate(dateStr) {
    window.NexusApp.State.setSelectedDate(dateStr);
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    renderCalendar();
  }

  function renderCalendar() {
    const container = document.getElementById('calendar-grid-container');
    const titleEl = document.getElementById('calendar-month-title');
    if (!container) return;

    const settings = window.NexusApp.State.getSettings();
    const weekStart = settings.weekStart || 'mon';
    const gridData = Dates.getMonthGrid(currentYear, currentMonth, weekStart);

    if (titleEl) {
      titleEl.textContent = `${gridData.monthName} ${gridData.year}`;
    }

    const selectedDate = window.NexusApp.State.getSelectedDate() || Dates.getTodayStr();
    const today = Dates.getTodayStr();

    // 1. Weekday labels in ONE 7-column row
    const dayHeaders = weekStart === 'mon'
      ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    let html = '<div class="cal-weekdays-row">';
    dayHeaders.forEach(dh => {
      html += `<div class="cal-weekday-label">${dh}</div>`;
    });
    html += '</div>';

    // 2. Dates Grid in 7 columns
    html += '<div class="cal-days-grid">';
    gridData.grid.forEach(cell => {
      const isSelected = cell.dateStr === selectedDate;
      const isTodayCell = cell.dateStr === today;
      const isOtherMonth = !cell.isCurrentMonth;

      // Retrieve tasks including recurring directives
      const tasks = window.NexusApp.Tasks.getTasksForDate(cell.dateStr, false);
      const total = tasks.length;
      const doneCount = tasks.filter(t => t.done).length;
      const allDone = total > 0 && doneCount === total;

      // Small colored square dots (capped at 4, then +)
      let dotsHtml = '<div class="cal-dots-row">';
      const maxDots = Math.min(total, 4);
      for (let i = 0; i < maxDots; i++) {
        const t = tasks[i];
        const prio = (t.priority || 'medium').toLowerCase();
        const isDone = Boolean(t.done);
        dotsHtml += `<span class="cal-dot cal-dot-${prio} ${isDone ? 'is-done' : ''}" title="${escapeHtml(t.title)} (${prio}${isDone ? ', completed' : ''})"></span>`;
      }
      if (total > 4) {
        dotsHtml += `<span class="cal-dot-more">+</span>`;
      }
      dotsHtml += '</div>';

      const cellClasses = [
        'cal-cell',
        isOtherMonth ? 'other-month' : 'in-month',
        isSelected ? 'is-selected' : '',
        isTodayCell ? 'is-today' : '',
        allDone ? 'all-done-glow' : ''
      ].filter(Boolean).join(' ');

      html += `
        <button type="button" 
                class="${cellClasses}" 
                data-date="${cell.dateStr}"
                aria-label="${cell.dateStr}, ${doneCount} of ${total} completed">
          <span class="cal-date-num">${cell.dayNumber}</span>
          ${dotsHtml}
        </button>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    // Trigger subtle 200ms transition animation
    container.classList.remove('cal-grid-transition');
    void container.offsetWidth; // Force reflow
    container.classList.add('cal-grid-transition');

    // Attach click listeners to date cells
    const cellButtons = container.querySelectorAll('.cal-cell');
    cellButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const dateStr = btn.getAttribute('data-date');
        if (dateStr) selectDate(dateStr);
      });
    });

    renderDaySummary(selectedDate);
  }

  function renderDaySummary(dateStr) {
    const inspectorEl = document.getElementById('calendar-day-inspector');
    if (!inspectorEl) return;

    const stats = window.NexusApp.Tasks.getDailyStats(dateStr);
    const tasks = window.NexusApp.Tasks.getTasksForDate(dateStr, false);
    const formattedDate = Dates.formatDisplayDate(dateStr, 'full');

    let tasksHtml = '';
    if (tasks.length === 0) {
      tasksHtml = `
        <div class="empty-state-notice" style="padding: 24px 12px;">
          No directives scheduled for ${Dates.formatDisplayDate(dateStr)}. Tap + Add Directive to schedule one.
        </div>
      `;
    } else {
      tasksHtml = tasks.map(t => window.NexusApp.UI.renderTaskFloatingRow(t, dateStr, 'calendar')).join('');
    }

    inspectorEl.innerHTML = `
      <div class="cal-day-summary-inner">
        <div class="cal-summary-header">
          <div class="cal-summary-info">
            <h4 class="cal-summary-date">${formattedDate}</h4>
            <div class="cal-summary-stats">${stats.done} of ${stats.total} completed (${stats.percent}%)</div>
          </div>
          <button type="button" class="nexus-btn nexus-btn-sm nexus-btn-primary" id="cal-add-task-btn" data-date="${dateStr}">
            + ADD DIRECTIVE
          </button>
        </div>

        <div class="cal-summary-bar-track" title="${stats.percent}% completed">
          <div class="cal-summary-bar-fill" style="width: ${stats.percent}%;"></div>
        </div>

        <div class="cal-summary-tasks">
          ${tasksHtml}
        </div>
      </div>
    `;

    // Attach row interactivity (checkbox toggle, edit modal, delete)
    window.NexusApp.UI.attachTaskRowListeners(inspectorEl);

    // Attach "+ Add Directive" action
    const addBtn = inspectorEl.querySelector('#cal-add-task-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        window.NexusApp.UI.openTaskEditModal('', dateStr);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    prevMonth,
    nextMonth,
    jumpToToday,
    selectDate,
    renderCalendar,
    renderDaySummary,
    renderDayInspector: renderDaySummary
  };
})();

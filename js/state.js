/**
 * NEXUS - Central State Store
 * Manages active date, current screen, filters, undo stack, and subscriptions
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.State = (function() {
  const listeners = [];
  const undoStack = [];

  const data = window.NexusApp.Storage.loadData();
  const todayStr = window.NexusApp.Dates.getTodayStr();

  const state = {
    selectedDate: todayStr,
    currentScreen: 'home', // 'home' | 'week' | 'lists' | 'calendar' | 'stats' | 'timer' | 'settings'
    weekTimelineStart: todayStr, // First date of the Week Board timeline
    filters: {
      search: '',
      priority: 'all',
      tag: 'all',
      status: 'all' // 'all' | 'pending' | 'done'
    },
    commandHubOpen: false,
    commandPaletteOpen: false,
    activeTimerTask: null,
    data: data
  };

  function subscribe(fn) {
    if (typeof fn === 'function' && !listeners.includes(fn)) {
      listeners.push(fn);
    }
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function notify(changeType = 'update', meta = {}) {
    listeners.forEach(fn => {
      try {
        fn(state, changeType, meta);
      } catch (err) {
        console.error('[NEXUS State] Listener error:', err);
      }
    });
  }

  function persist(immediate = false) {
    window.NexusApp.Storage.saveData(state.data, immediate);
  }

  return {
    get: () => state,
    getData: () => state.data,

    getSelectedDate: () => state.selectedDate,
    setSelectedDate: (dateStr) => {
      if (state.selectedDate !== dateStr) {
        state.selectedDate = dateStr;
        notify('dateChange', { date: dateStr });
      }
    },

    getCurrentScreen: () => state.currentScreen,
    setCurrentScreen: (screen) => {
      if (state.currentScreen !== screen) {
        state.currentScreen = screen;
        notify('screenChange', { screen });
      }
    },

    getWeekTimelineStart: () => state.weekTimelineStart,
    setWeekTimelineStart: (dateStr) => {
      state.weekTimelineStart = dateStr;
      notify('weekShift', { start: dateStr });
    },
    shiftWeekTimeline: (days) => {
      state.weekTimelineStart = window.NexusApp.Dates.addDays(state.weekTimelineStart, days);
      notify('weekShift', { start: state.weekTimelineStart });
    },
    resetWeekTimelineToToday: () => {
      state.weekTimelineStart = window.NexusApp.Dates.getTodayStr();
      notify('weekShift', { start: state.weekTimelineStart });
    },

    getFilters: () => state.filters,
    setFilter: (key, val) => {
      state.filters[key] = val;
      notify('filterChange', { key, val });
    },
    resetFilters: () => {
      state.filters = { search: '', priority: 'all', tag: 'all', status: 'all' };
      notify('filterChange');
    },

    isCommandHubOpen: () => state.commandHubOpen,
    setCommandHubOpen: (isOpen) => {
      state.commandHubOpen = Boolean(isOpen);
      notify('hubToggle', { open: state.commandHubOpen });
    },

    isCommandPaletteOpen: () => state.commandPaletteOpen,
    setCommandPaletteOpen: (isOpen) => {
      state.commandPaletteOpen = Boolean(isOpen);
      notify('paletteToggle', { open: state.commandPaletteOpen });
    },

    getActiveTimerTask: () => state.activeTimerTask,
    setActiveTimerTask: (task) => {
      state.activeTimerTask = task;
      notify('timerTaskChange', { task });
    },

    getSettings: () => state.data.settings,
    updateSettings: (newSettings) => {
      state.data.settings = { ...state.data.settings, ...newSettings };
      persist(true);
      notify('settingsChange', { settings: state.data.settings });
    },

    // Undo Stack handling
    pushUndo: (undoAction) => {
      undoStack.push({ timestamp: Date.now(), ...undoAction });
      if (undoStack.length > 25) undoStack.shift();
    },
    popUndo: () => {
      if (undoStack.length === 0) return null;
      return undoStack.pop();
    },
    hasUndo: () => undoStack.length > 0,

    commit: (changeType = 'update', meta = {}) => {
      persist(false);
      notify(changeType, meta);
    },

    commitImmediate: (changeType = 'update', meta = {}) => {
      persist(true);
      notify(changeType, meta);
    },

    replaceData: (newData) => {
      state.data = newData;
      persist(true);
      notify('dataReset');
    },

    subscribe
  };
})();

/**
 * NEXUS - Local Storage & Persistence Engine
 * Versioned schema ("nexus_v1"). Starts COMPLETELY EMPTY on first run.
 * Robust try/catch wrappers, debounced persistence, JSON export & import.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Storage = (function() {
  const STORAGE_KEY = window.NexusApp.Config.STORAGE_KEY;
  const CURRENT_SCHEMA = window.NexusApp.Config.SCHEMA_VERSION;

  function generateUUID() {
    return 'nx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  // Pure empty initial state on first run - ZERO seed data
  function getEmptyInitialData() {
    return {
      schemaVersion: CURRENT_SCHEMA,
      lastSaved: new Date().toISOString(),
      settings: { ...window.NexusApp.Config.DEFAULT_SETTINGS },
      tasks: [],      // Completely empty: user adds their own
      recurring: [],  // Completely empty: user adds their own
      lists: []       // Completely empty: user creates their own
    };
  }

  function migrateData(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return getEmptyInitialData();
    }
    parsed.schemaVersion = CURRENT_SCHEMA;
    parsed.settings = { ...window.NexusApp.Config.DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    parsed.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    parsed.recurring = Array.isArray(parsed.recurring) ? parsed.recurring : [];
    parsed.lists = Array.isArray(parsed.lists) ? parsed.lists : [];
    return parsed;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = getEmptyInitialData();
        saveData(fresh, true);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      return migrateData(parsed);
    } catch (err) {
      console.warn('[NEXUS Storage] Error parsing storage, initializing clean state:', err);
      const fresh = getEmptyInitialData();
      return fresh;
    }
  }

  let saveTimer = null;
  function saveData(data, immediate = false) {
    const executeSave = () => {
      try {
        data.lastSaved = new Date().toISOString();
        const json = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, json);
      } catch (err) {
        console.error('[NEXUS Storage] Failed to write localStorage:', err);
        if (err && err.name === 'QuotaExceededError') {
          alert('STORAGE LIMIT: Browser storage is full. Please export a JSON backup.');
        }
      }
    };

    if (immediate) {
      if (saveTimer) clearTimeout(saveTimer);
      executeSave();
    } else {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(executeSave, 150); // 150ms debounce
    }
  }

  function exportJSON(data) {
    try {
      const backup = {
        app: window.NexusApp.Config.APP_NAME,
        version: CURRENT_SCHEMA,
        exportedAt: new Date().toISOString(),
        data: data
      };
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = window.NexusApp.Dates.getTodayStr();
      a.href = url;
      a.download = `nexus_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('[NEXUS Storage] Export failed:', err);
      return false;
    }
  }

  function importJSON(jsonStr, mode = 'merge', currentData) {
    try {
      const parsed = JSON.parse(jsonStr);
      const payload = parsed.data || parsed;

      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid backup file structure.');
      }

      const validPayload = migrateData(payload);

      if (mode === 'replace') {
        saveData(validPayload, true);
        return validPayload;
      }

      // Merge Mode
      const existingTaskIds = new Set(currentData.tasks.map(t => t.id));
      const mergedTasks = [...currentData.tasks];
      validPayload.tasks.forEach(t => {
        if (!existingTaskIds.has(t.id)) {
          mergedTasks.push(t);
        }
      });

      const existingRecIds = new Set(currentData.recurring.map(r => r.id));
      const mergedRecurring = [...currentData.recurring];
      validPayload.recurring.forEach(r => {
        if (!existingRecIds.has(r.id)) {
          mergedRecurring.push(r);
        }
      });

      const mergedLists = [...currentData.lists];
      validPayload.lists.forEach(impList => {
        const found = mergedLists.find(l => l.name.toLowerCase() === impList.name.toLowerCase());
        if (found) {
          const itemTexts = new Set(found.items.map(i => i.text.toLowerCase()));
          impList.items.forEach(item => {
            if (!itemTexts.has(item.text.toLowerCase())) {
              found.items.push(item);
            }
          });
        } else {
          mergedLists.push(impList);
        }
      });

      const merged = {
        schemaVersion: CURRENT_SCHEMA,
        lastSaved: new Date().toISOString(),
        settings: { ...currentData.settings, ...(validPayload.settings || {}) },
        tasks: mergedTasks,
        recurring: mergedRecurring,
        lists: mergedLists
      };

      saveData(merged, true);
      return merged;
    } catch (err) {
      console.error('[NEXUS Storage] Import error:', err);
      throw err;
    }
  }

  function resetAllData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      const fresh = getEmptyInitialData();
      saveData(fresh, true);
      return fresh;
    } catch (err) {
      console.error('[NEXUS Storage] Reset error:', err);
      return getEmptyInitialData();
    }
  }

  return {
    generateUUID,
    loadData,
    saveData,
    exportJSON,
    importJSON,
    resetAllData
  };
})();

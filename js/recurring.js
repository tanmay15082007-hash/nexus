/**
 * NEXUS - Recurring Directive Engine
 * Separate template store. Dynamic date generation.
 * Zero cross-day contamination: completion tracked strictly per-date.
 * Starts completely empty on first launch.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Recurring = (function() {
  const Dates = window.NexusApp.Dates;
  const Storage = window.NexusApp.Storage;

  function doesTemplateMatchDate(template, dateStr) {
    if (!template || template.paused) return false;

    // Check Start Date
    if (template.startDate && dateStr < template.startDate) {
      return false;
    }

    // Check End Date
    if (template.endDate && dateStr > template.endDate) {
      return false;
    }

    // Check Skip Exceptions
    if (template.exceptions && template.exceptions[dateStr] === 'skipped') {
      return false;
    }

    const d = Dates.strToDate(dateStr);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const dayOfMonth = d.getDate();
    const repeat = template.repeat || { type: 'daily' };

    switch (repeat.type) {
      case 'daily':
        return true;

      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;

      case 'weekly':
        if (Array.isArray(repeat.days)) {
          return repeat.days.includes(dayOfWeek);
        }
        return false;

      case 'monthly':
        if (repeat.dayOfMonth) {
          const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          const targetDay = Math.min(repeat.dayOfMonth, daysInMonth);
          return dayOfMonth === targetDay;
        }
        return false;

      default:
        return false;
    }
  }

  function getInstancesForDate(dateStr) {
    const stateData = window.NexusApp.State.getData();
    const templates = stateData.recurring || [];
    const instances = [];

    templates.forEach(tpl => {
      if (doesTemplateMatchDate(tpl, dateStr)) {
        const isDone = Boolean(tpl.completions && tpl.completions[dateStr]);
        instances.push({
          id: `rec_${tpl.id}_${dateStr}`,
          recurringId: tpl.id,
          isRecurringInstance: true,
          title: tpl.title,
          notes: tpl.notes || '',
          date: dateStr,
          time: tpl.time || '',
          priority: tpl.priority || 'medium',
          tag: tpl.tag || 'dev',
          done: isDone,
          doneAt: isDone ? (tpl.completions[dateStr] === true ? dateStr : tpl.completions[dateStr]) : null,
          subtasks: [],
          carriedFrom: null,
          repeatInfo: tpl.repeat
        });
      }
    });

    return instances;
  }

  function toggleInstanceCompletion(recurringId, dateStr) {
    const stateData = window.NexusApp.State.getData();
    const tpl = (stateData.recurring || []).find(r => r.id === recurringId);
    if (!tpl) return false;

    tpl.completions = tpl.completions || {};
    const currentlyDone = Boolean(tpl.completions[dateStr]);

    if (currentlyDone) {
      delete tpl.completions[dateStr];
    } else {
      tpl.completions[dateStr] = new Date().toISOString();
    }

    window.NexusApp.State.commit('recurringToggle', { recurringId, dateStr, done: !currentlyDone });
    return !currentlyDone;
  }

  function createTemplate(templateData) {
    const stateData = window.NexusApp.State.getData();
    const newTemplate = {
      id: Storage.generateUUID(),
      title: templateData.title.trim(),
      notes: (templateData.notes || '').trim(),
      time: templateData.time || '',
      priority: templateData.priority || 'medium',
      tag: templateData.tag || 'work',
      repeat: templateData.repeat || { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6], dayOfMonth: 1 },
      startDate: templateData.startDate || Dates.getTodayStr(),
      endDate: templateData.endDate || null,
      paused: false,
      completions: {},
      exceptions: {}
    };

    stateData.recurring.push(newTemplate);
    window.NexusApp.State.commit('recurringCreate', { template: newTemplate });
    return newTemplate;
  }

  function updateTemplate(id, updates) {
    const stateData = window.NexusApp.State.getData();
    const tpl = (stateData.recurring || []).find(r => r.id === id);
    if (!tpl) return null;

    Object.assign(tpl, updates);
    window.NexusApp.State.commit('recurringUpdate', { template: tpl });
    return tpl;
  }

  function togglePauseTemplate(id) {
    const stateData = window.NexusApp.State.getData();
    const tpl = (stateData.recurring || []).find(r => r.id === id);
    if (!tpl) return false;

    tpl.paused = !tpl.paused;
    window.NexusApp.State.commit('recurringPause', { id, paused: tpl.paused });
    return tpl.paused;
  }

  function deleteTemplate(id) {
    const stateData = window.NexusApp.State.getData();
    const idx = (stateData.recurring || []).findIndex(r => r.id === id);
    if (idx === -1) return false;

    const removed = stateData.recurring.splice(idx, 1)[0];
    window.NexusApp.State.pushUndo({
      type: 'recurringDelete',
      template: removed
    });

    window.NexusApp.State.commit('recurringDelete', { id });
    return true;
  }

  function deleteInstanceChoice(recurringId, dateStr, choice = 'thisDay') {
    const stateData = window.NexusApp.State.getData();
    const tpl = (stateData.recurring || []).find(r => r.id === recurringId);
    if (!tpl) return;

    if (choice === 'thisDay') {
      tpl.exceptions = tpl.exceptions || {};
      tpl.exceptions[dateStr] = 'skipped';
      window.NexusApp.State.pushUndo({
        type: 'recurringSkipUndo',
        recurringId,
        dateStr
      });
      window.NexusApp.State.commit('recurringSkipDay', { recurringId, dateStr });
    } else if (choice === 'allFuture') {
      const prevDay = Dates.addDays(dateStr, -1);
      const oldEndDate = tpl.endDate;
      tpl.endDate = prevDay;

      window.NexusApp.State.pushUndo({
        type: 'recurringEndDateUndo',
        recurringId,
        oldEndDate
      });
      window.NexusApp.State.commit('recurringEndFuture', { recurringId, dateStr });
    }
  }

  return {
    doesTemplateMatchDate,
    getInstancesForDate,
    toggleInstanceCompletion,
    createTemplate,
    updateTemplate,
    togglePauseTemplate,
    deleteTemplate,
    deleteInstanceChoice
  };
})();

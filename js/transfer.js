/**
 * NEXUS - Transfer Tasks Protocol Engine
 * Moves or copies incomplete tasks from past dates to today or any future date.
 * Features 3 modes, select-all preview checklists, duplicate avoidance, and 1-click Undo.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Transfer = (function() {
  const Dates = window.NexusApp.Dates;
  const Storage = window.NexusApp.Storage;

  function getEligibleTasks(mode, specificDate) {
    const today = Dates.getTodayStr();
    const stateData = window.NexusApp.State.getData();
    const allTasks = stateData.tasks || [];

    switch (mode) {
      case 'specific':
        if (!specificDate) return [];
        return allTasks.filter(t => t.date === specificDate && !t.done);

      case 'lastWeek':
        const sevenDaysAgo = Dates.addDays(today, -7);
        return allTasks.filter(t => t.date >= sevenDaysAgo && t.date < today && !t.done);

      case 'allPast':
      default:
        return allTasks.filter(t => t.date < today && !t.done);
    }
  }

  function executeTransfer({ taskIds, targetDate, actionType = 'move' }) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return { success: false, count: 0, message: 'No directives selected for transfer.' };
    }

    if (!targetDate) {
      targetDate = Dates.getTodayStr();
    }

    const stateData = window.NexusApp.State.getData();
    const previousSnapshot = JSON.parse(JSON.stringify(stateData.tasks));

    const existingTargetTitles = new Set(
      stateData.tasks
        .filter(t => t.date === targetDate)
        .map(t => t.title.toLowerCase().trim())
    );

    let processedCount = 0;
    const transferredTasks = [];

    taskIds.forEach(id => {
      const task = stateData.tasks.find(t => t.id === id);
      if (!task) return;

      const titleKey = task.title.toLowerCase().trim();
      const originalDate = task.date;

      if (actionType === 'move') {
        if (existingTargetTitles.has(titleKey) && task.date === targetDate) {
          return;
        }

        task.carriedFrom = task.carriedFrom || originalDate;
        task.date = targetDate;
        task.order = stateData.tasks.filter(t => t.date === targetDate).length;
        transferredTasks.push(task);
        processedCount++;
      } else if (actionType === 'copy') {
        if (existingTargetTitles.has(titleKey)) {
          return;
        }

        const cloned = {
          ...task,
          id: Storage.generateUUID(),
          date: targetDate,
          carriedFrom: originalDate,
          done: false,
          doneAt: null,
          order: stateData.tasks.filter(t => t.date === targetDate).length,
          subtasks: (task.subtasks || []).map(s => ({ ...s, id: Storage.generateUUID(), done: false })),
          createdAt: new Date().toISOString()
        };

        stateData.tasks.push(cloned);
        existingTargetTitles.add(titleKey);
        transferredTasks.push(cloned);
        processedCount++;
      }
    });

    if (processedCount === 0) {
      return {
        success: false,
        count: 0,
        message: 'Selected directives already exist on the target date.'
      };
    }

    window.NexusApp.State.pushUndo({
      type: 'transferUndo',
      originalTasks: previousSnapshot,
      count: processedCount,
      targetDate: targetDate
    });

    if (window.NexusApp.Audio) window.NexusApp.Audio.alert();
    window.NexusApp.State.commit('transferExecuted', { count: processedCount, targetDate, actionType });

    const formattedTarget = Dates.formatDisplayDate(targetDate);
    const actionVerb = actionType === 'move' ? 'moved' : 'copied';
    const message = `${processedCount} task(s) ${actionVerb} to ${formattedTarget}`;

    if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
      window.NexusApp.UI.showToast(message, 'Undo', () => {
        window.NexusApp.Tasks.undoLastAction();
      });
    }

    return {
      success: true,
      count: processedCount,
      targetDate,
      message
    };
  }

  return {
    getEligibleTasks,
    executeTransfer
  };
})();

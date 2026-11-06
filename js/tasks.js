/**
 * NEXUS - Task Management & Sorting Engine
 * Floating row operations, subtask checklists, sorting algorithms, overdue resolver
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Tasks = (function() {
  const Dates = window.NexusApp.Dates;
  const Storage = window.NexusApp.Storage;
  const Config = window.NexusApp.Config;

  function taskSortComparator(a, b) {
    // 1. Completion state: finished directives sink to bottom
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }

    // 2. Time comparison
    if (a.time && b.time) {
      if (a.time !== b.time) return a.time.localeCompare(b.time);
    } else if (a.time && !b.time) {
      return -1;
    } else if (!a.time && b.time) {
      return 1;
    }

    // 3. Priority weight
    const pA = Config.PRIORITIES[a.priority] ? Config.PRIORITIES[a.priority].order : 99;
    const pB = Config.PRIORITIES[b.priority] ? Config.PRIORITIES[b.priority].order : 99;
    if (pA !== pB) {
      return pA - pB;
    }

    // 4. Order index
    return (a.order || 0) - (b.order || 0);
  }

  function getTasksForDate(dateStr, applyFilters = false) {
    const stateData = window.NexusApp.State.getData();
    const regularTasks = (stateData.tasks || []).filter(t => t.date === dateStr);
    const recurringInstances = window.NexusApp.Recurring.getInstancesForDate(dateStr);

    let combined = [...regularTasks, ...recurringInstances];

    if (applyFilters) {
      const filters = window.NexusApp.State.getFilters();
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        combined = combined.filter(t => 
          t.title.toLowerCase().includes(q) || 
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      }
      if (filters.priority && filters.priority !== 'all') {
        combined = combined.filter(t => t.priority === filters.priority);
      }
      if (filters.tag && filters.tag !== 'all') {
        combined = combined.filter(t => t.tag === filters.tag);
      }
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'pending') combined = combined.filter(t => !t.done);
        if (filters.status === 'done') combined = combined.filter(t => t.done);
      }
    }

    combined.sort(taskSortComparator);
    return combined;
  }

  function addTask(taskData) {
    const stateData = window.NexusApp.State.getData();
    const newTask = {
      id: Storage.generateUUID(),
      title: (taskData.title || '').trim(),
      notes: (taskData.notes || '').trim(),
      date: taskData.date || Dates.getTodayStr(),
      time: taskData.time || '',
      priority: taskData.priority || 'medium',
      tag: taskData.tag || 'work',
      done: Boolean(taskData.done),
      doneAt: taskData.done ? new Date().toISOString() : null,
      order: stateData.tasks.filter(t => t.date === (taskData.date || Dates.getTodayStr())).length,
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      recurringId: null,
      carriedFrom: taskData.carriedFrom || null,
      createdAt: new Date().toISOString()
    };

    stateData.tasks.push(newTask);
    window.NexusApp.State.commit('taskAdd', { task: newTask });
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    return newTask;
  }

  function updateTask(id, updates) {
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === id);
    if (!task) return null;

    Object.assign(task, updates);
    window.NexusApp.State.commit('taskUpdate', { task });
    return task;
  }

  function toggleTaskDone(id, dateStr) {
    if (typeof id === 'string' && id.startsWith('rec_')) {
      const instances = window.NexusApp.Recurring.getInstancesForDate(dateStr);
      const inst = instances.find(i => i.id === id);
      if (inst && inst.recurringId) {
        const isDone = window.NexusApp.Recurring.toggleInstanceCompletion(inst.recurringId, dateStr);
        if (isDone && window.NexusApp.Audio) {
          window.NexusApp.Audio.complete();
        }
        return isDone;
      }
      return false;
    }

    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === id);
    if (!task) return false;

    task.done = !task.done;
    task.doneAt = task.done ? new Date().toISOString() : null;

    if (task.done && window.NexusApp.Audio) {
      window.NexusApp.Audio.complete();
    } else if (!task.done && window.NexusApp.Audio) {
      window.NexusApp.Audio.click();
    }

    window.NexusApp.State.commit('taskToggle', { task, done: task.done });
    return task.done;
  }

  function deleteTask(id, dateStr) {
    if (typeof id === 'string' && id.startsWith('rec_')) {
      const instances = window.NexusApp.Recurring.getInstancesForDate(dateStr);
      const inst = instances.find(i => i.id === id);
      if (inst && inst.recurringId) {
        if (window.NexusApp.UI && window.NexusApp.UI.promptRecurringDeleteChoice) {
          window.NexusApp.UI.promptRecurringDeleteChoice(inst.recurringId, dateStr);
        }
        return true;
      }
      return false;
    }

    const stateData = window.NexusApp.State.getData();
    const idx = (stateData.tasks || []).findIndex(t => t.id === id);
    if (idx === -1) return false;

    const removed = stateData.tasks.splice(idx, 1)[0];

    window.NexusApp.State.pushUndo({
      type: 'taskDelete',
      task: removed,
      originalIndex: idx
    });

    if (window.NexusApp.Audio) window.NexusApp.Audio.delete();
    window.NexusApp.State.commit('taskDelete', { id });

    if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
      window.NexusApp.UI.showToast('Directive removed', 'Undo', () => {
        window.NexusApp.Tasks.undoLastAction();
      });
    }

    return true;
  }

  function undoLastAction() {
    const action = window.NexusApp.State.popUndo();
    if (!action) return false;

    const stateData = window.NexusApp.State.getData();

    switch (action.type) {
      case 'taskDelete':
        if (action.task) {
          stateData.tasks.splice(
            action.originalIndex !== undefined ? action.originalIndex : stateData.tasks.length,
            0,
            action.task
          );
          window.NexusApp.State.commit('taskRestore', { task: action.task });
          if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
            window.NexusApp.UI.showToast('Directive restored');
          }
        }
        break;

      case 'transferUndo':
        if (Array.isArray(action.originalTasks)) {
          stateData.tasks = [...action.originalTasks];
          window.NexusApp.State.commit('transferReverted');
          if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
            window.NexusApp.UI.showToast('Transfer protocol reverted');
          }
        }
        break;

      case 'recurringSkipUndo':
        const tpl = (stateData.recurring || []).find(r => r.id === action.recurringId);
        if (tpl && tpl.exceptions) {
          delete tpl.exceptions[action.dateStr];
          window.NexusApp.State.commit('recurringRestore');
        }
        break;

      case 'recurringEndDateUndo':
        const rTpl = (stateData.recurring || []).find(r => r.id === action.recurringId);
        if (rTpl) {
          rTpl.endDate = action.oldEndDate;
          window.NexusApp.State.commit('recurringRestore');
        }
        break;

      default:
        return false;
    }

    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    return true;
  }

  function addSubtask(taskId, text) {
    if (!text || !text.trim()) return null;
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    if (!task) return null;

    task.subtasks = task.subtasks || [];
    const subtask = {
      id: Storage.generateUUID(),
      text: text.trim(),
      done: false
    };
    task.subtasks.push(subtask);
    window.NexusApp.State.commit('subtaskAdd', { taskId, subtask });
    return subtask;
  }

  function toggleSubtask(taskId, subtaskId) {
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    if (!task || !task.subtasks) return false;

    const st = task.subtasks.find(s => s.id === subtaskId);
    if (!st) return false;

    st.done = !st.done;
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
    window.NexusApp.State.commit('subtaskToggle', { taskId, subtaskId, done: st.done });
    return st.done;
  }

  function deleteSubtask(taskId, subtaskId) {
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    if (!task || !task.subtasks) return false;

    const idx = task.subtasks.findIndex(s => s.id === subtaskId);
    if (idx === -1) return false;

    task.subtasks.splice(idx, 1);
    window.NexusApp.State.commit('subtaskDelete', { taskId, subtaskId });
    return true;
  }

  function getSubtaskStats(task) {
    if (!task || !task.subtasks || task.subtasks.length === 0) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const total = task.subtasks.length;
    const completed = task.subtasks.filter(s => s.done).length;
    const percent = Math.round((completed / total) * 100);
    return { total, completed, percent };
  }

  function moveTaskToDate(taskId, targetDate) {
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    if (!task) return false;

    const oldDate = task.date;
    task.date = targetDate;
    if (Dates.isPast(oldDate) && targetDate >= Dates.getTodayStr()) {
      task.carriedFrom = oldDate;
    }
    window.NexusApp.State.commit('taskMove', { taskId, oldDate, newDate: targetDate });
    return true;
  }

  function reorderTasks(dateStr, orderedIds) {
    const stateData = window.NexusApp.State.getData();
    orderedIds.forEach((id, index) => {
      const t = (stateData.tasks || []).find(task => task.id === id);
      if (t) {
        t.order = index;
      }
    });
    window.NexusApp.State.commit('taskReorder', { dateStr });
  }

  function getOverdueTasks() {
    const today = Dates.getTodayStr();
    const stateData = window.NexusApp.State.getData();
    return (stateData.tasks || []).filter(t => t.date < today && !t.done);
  }

  function moveAllOverdueToToday() {
    const overdue = getOverdueTasks();
    if (overdue.length === 0) return 0;

    const today = Dates.getTodayStr();
    const stateData = window.NexusApp.State.getData();

    const previousSnapshot = JSON.parse(JSON.stringify(stateData.tasks));
    window.NexusApp.State.pushUndo({
      type: 'transferUndo',
      originalTasks: previousSnapshot
    });

    overdue.forEach(t => {
      t.carriedFrom = t.date;
      t.date = today;
    });

    window.NexusApp.State.commit('moveOverdueBatch', { count: overdue.length });
    if (window.NexusApp.Audio) window.NexusApp.Audio.alert();

    if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
      window.NexusApp.UI.showToast(
        `${overdue.length} overdue task(s) moved to Today`,
        'Undo',
        () => window.NexusApp.Tasks.undoLastAction()
      );
    }

    return overdue.length;
  }

  function getDailyStats(dateStr) {
    const tasks = getTasksForDate(dateStr, false);
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = total - done;
    const isPastDate = Dates.isPast(dateStr);
    const overdue = isPastDate ? pending : 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      total,
      done,
      pending,
      overdue,
      percent
    };
  }

  return {
    getTasksForDate,
    addTask,
    updateTask,
    toggleTaskDone,
    deleteTask,
    undoLastAction,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    getSubtaskStats,
    moveTaskToDate,
    reorderTasks,
    getOverdueTasks,
    moveAllOverdueToToday,
    getDailyStats
  };
})();

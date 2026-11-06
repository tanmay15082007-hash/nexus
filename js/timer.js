/**
 * NEXUS - Holographic Focus Pomodoro Timer
 * Circular holographic countdown ring, sound cues, task target binding
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Timer = (function() {
  const Config = window.NexusApp.Config;

  let timerInterval = null;
  let remainingSeconds = Config.POMODORO.focus;
  let totalDuration = Config.POMODORO.focus;
  let isRunning = false;
  let currentMode = 'focus'; // 'focus' | 'shortBreak' | 'longBreak'
  let boundTaskId = null;

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function setMode(mode) {
    pause();
    currentMode = mode;
    if (mode === 'focus') {
      totalDuration = Config.POMODORO.focus;
    } else if (mode === 'shortBreak') {
      totalDuration = Config.POMODORO.shortBreak;
    } else if (mode === 'longBreak') {
      totalDuration = Config.POMODORO.longBreak;
    }
    remainingSeconds = totalDuration;
    renderTimer();
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();

    timerInterval = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        pause();
        onTimerComplete();
      }
      renderTimer();
    }, 1000);

    renderTimer();
  }

  function pause() {
    if (!isRunning) return;
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    renderTimer();
  }

  function reset() {
    pause();
    remainingSeconds = totalDuration;
    renderTimer();
    if (window.NexusApp.Audio) window.NexusApp.Audio.click();
  }

  function toggle() {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }

  function bindTask(taskId) {
    boundTaskId = taskId;
    const stateData = window.NexusApp.State.getData();
    const task = (stateData.tasks || []).find(t => t.id === taskId);
    window.NexusApp.State.setActiveTimerTask(task || null);
    renderTimer();
  }

  function onTimerComplete() {
    if (window.NexusApp.Audio) window.NexusApp.Audio.alert();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('NEXUS Focus Telemetry', {
          body: currentMode === 'focus' ? 'Focus cycle finished! Stand down for recovery.' : 'Recovery ended. Ready for next operational cycle.',
          icon: 'assets/icons/icon-192.png'
        });
      } catch (e) {}
    }

    if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
      const msg = currentMode === 'focus' ? 'Focus cycle complete. Well done!' : 'Break ended. Ready for action.';
      window.NexusApp.UI.showToast(msg);
    }
  }

  function renderTimer() {
    const timeDisplay = document.getElementById('timer-time-display');
    const startBtn = document.getElementById('timer-start-btn');
    const progressCircle = document.getElementById('timer-progress-ring');
    const taskBadge = document.getElementById('timer-task-badge');

    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const formatted = `${pad(m)}:${pad(s)}`;

    if (timeDisplay) timeDisplay.textContent = formatted;
    if (startBtn) {
      startBtn.textContent = isRunning ? 'PAUSE' : 'ENGAGE';
      startBtn.classList.toggle('active', isRunning);
    }

    if (progressCircle) {
      const radius = 70;
      const circumference = 2 * Math.PI * radius;
      const progress = totalDuration > 0 ? (remainingSeconds / totalDuration) : 0;
      const offset = circumference - (progress * circumference);
      progressCircle.style.strokeDasharray = `${circumference}`;
      progressCircle.style.strokeDashoffset = `${offset}`;
    }

    if (taskBadge) {
      const activeTask = window.NexusApp.State.getActiveTimerTask();
      if (activeTask) {
        taskBadge.textContent = `TARGET: ${activeTask.title.toUpperCase()}`;
        taskBadge.style.display = 'inline-block';
      } else {
        taskBadge.textContent = 'NO TARGET BOUND';
        taskBadge.style.display = 'inline-block';
      }
    }
  }

  return {
    setMode,
    start,
    pause,
    reset,
    toggle,
    bindTask,
    renderTimer,
    isRunning: () => isRunning
  };
})();

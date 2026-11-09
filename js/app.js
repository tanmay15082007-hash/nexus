/**
 * NEXUS - Core Application Bootstrapper
 * Boot animation sequence (< 1.5s), live clock ticker, global keyboard shortcuts, hub bindings
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.App = (function() {
  const State = window.NexusApp.State;
  const Dates = window.NexusApp.Dates;
  const Tasks = window.NexusApp.Tasks;
  const UI = window.NexusApp.UI;
  const Hub = window.NexusApp.Hub;
  const Palette = window.NexusApp.Palette;
  const Audio = window.NexusApp.Audio;

  function init() {
    console.log('[NEXUS] Initializing Command Deck...');

    runBootSequence();
    startClock();

    // Initialize subsystems
    UI.init();
    Hub.init();
    Palette.init();

    if (window.NexusApp.PWA) {
      window.NexusApp.PWA.init();
    }

    if (window.NexusApp.Extras) {
      window.NexusApp.Extras.init();
    }

    setupTopBarButtons();
    setupKeyboardShortcuts();
  }

  function runBootSequence() {
    const bootOverlay = document.getElementById('nexus-boot-overlay');
    const skipBtn = document.getElementById('boot-skip-btn');
    if (!bootOverlay) return;

    const s = State.getSettings();
    if (!s.showBootAnimation) {
      bootOverlay.style.display = 'none';
      return;
    }

    if (Audio) Audio.boot();

    const bootTimer = setTimeout(() => {
      dismissBoot();
    }, 1200);

    function dismissBoot() {
      clearTimeout(bootTimer);
      bootOverlay.classList.add('fade-out');
      setTimeout(() => {
        bootOverlay.style.display = 'none';
      }, 350);
    }

    if (skipBtn) skipBtn.addEventListener('click', dismissBoot);
    bootOverlay.addEventListener('click', dismissBoot);
  }

  function startClock() {
    const clockEl = document.getElementById('top-bar-clock');
    const dateEl = document.getElementById('top-bar-date');

    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');

      if (clockEl) {
        clockEl.innerHTML = `${h}<span class="clock-colon">:</span>${m}<span class="clock-colon">:</span>${s}`;
      }
      if (dateEl) {
        dateEl.textContent = Dates.formatDisplayDate(Dates.getTodayStr(), 'header');
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  function setupTopBarButtons() {
    // Quick-access top bar icons
    const calBtn = document.getElementById('btn-quick-calendar');
    if (calBtn) calBtn.addEventListener('click', () => Hub.openSlidePanel('panel-calendar'));

    const transferBtn = document.getElementById('btn-quick-transfer');
    if (transferBtn) transferBtn.addEventListener('click', () => Hub.openSlidePanel('panel-transfer'));

    const recBtn = document.getElementById('btn-quick-recurring');
    if (recBtn) recBtn.addEventListener('click', () => Hub.openSlidePanel('panel-recurring'));

    // Mobile FAB (+)
    const mobileFab = document.getElementById('mobile-fab-add');
    if (mobileFab) mobileFab.addEventListener('click', () => UI.openTaskEditModal());

    // Mobile bottom nav: Add (+)
    const bottomAdd = document.getElementById('mobile-bottom-add-btn');
    if (bottomAdd) bottomAdd.addEventListener('click', () => UI.openTaskEditModal());

    // Mobile bottom nav: Hub
    const bottomHub = document.getElementById('mobile-bottom-hub-btn');
    if (bottomHub) bottomHub.addEventListener('click', () => Hub.toggleHub());

    // Mobile bottom nav: Today and Stats (switch screens)
    document.querySelectorAll('.bottom-nav-btn[data-nav-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.setCurrentScreen(btn.getAttribute('data-nav-screen'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Mobile bottom nav: Calendar (opens a panel)
    document.querySelectorAll('.bottom-nav-btn[data-nav-panel]').forEach(btn => {
      btn.addEventListener('click', () => Hub.openSlidePanel(btn.getAttribute('data-nav-panel')));
    });

    // Highlight the active tab (Today / Stats)
    function syncBottomNav() {
      const current = State.getCurrentScreen();
      document.querySelectorAll('.bottom-nav-btn[data-nav-screen]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-nav-screen') === current);
      });
    }
    State.subscribe(syncBottomNav);
    syncBottomNav();
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      // Escape key closes open overlays
      if (e.key === 'Escape') {
        if (State.isCommandPaletteOpen()) {
          Palette.closePalette();
          return;
        }
        if (State.isCommandHubOpen()) {
          Hub.closeHub();
          return;
        }
        Hub.closeSlidePanel();
        UI.closeTaskEditModal();
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInput) {
          e.preventDefault();
          Tasks.undoLastAction();
          return;
        }
      }

      // Don't trigger letter shortcuts when user is typing in inputs
      if (isInput) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          UI.openTaskEditModal();
          break;

        case 't':
          e.preventDefault();
          State.setCurrentScreen('home');
          State.setSelectedDate(Dates.getTodayStr());
          UI.showToast('Returned to Today');
          break;

        case 'c':
          e.preventDefault();
          Hub.openSlidePanel('panel-calendar');
          break;

        case 'r':
          e.preventDefault();
          Hub.openSlidePanel('panel-recurring');
          break;

        case '/': {
          e.preventDefault();
          const searchInput = document.getElementById('home-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;
        }

        case '?':
          e.preventDefault();
          Hub.openSlidePanel('panel-shortcuts');
          break;
      }
    });
  }

  return {
    init
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.NexusApp.App.init);
} else {
  window.NexusApp.App.init();
}

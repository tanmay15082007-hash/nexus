/**
 * NEXUS - Back gesture / back button handling
 * Closes the top-most overlay first, then returns to Today, and only then leaves the app.
 * A history entry exists only while something needs "going back".
 */
(function () {
  const App = window.NexusApp;
  const $ = (id) => document.getElementById(id);

  let armed = false;      // true while our extra history entry exists
  let ignorePops = 0;     // pops we caused ourselves (history.back)
  let queued = false;

  // Returns a function that closes the top-most overlay, or null if none is open
  function topOverlay() {
    const dialogs = document.querySelectorAll('.nx-dialog-backdrop');
    if (dialogs.length) {
      const dlg = dialogs[dialogs.length - 1];
      return () => dlg.click();     // backdrop click = cancel
    }
    const palette = $('command-palette-modal');
    if (palette && palette.classList.contains('active')) return () => App.Palette.closePalette();

    const modal = $('task-edit-dialog-modal');
    if (modal && modal.classList.contains('active')) return () => App.UI.closeTaskEditModal();

    const hub = $('command-hub-overlay');
    if (hub && hub.classList.contains('active')) return () => App.Hub.closeHub();

    if (document.querySelector('.nexus-slide-panel.active')) return () => App.Hub.closeSlidePanel();
    return null;
  }

  function needGuard() {
    return Boolean(topOverlay()) || App.State.getCurrentScreen() !== 'home';
  }

  function sync() {
    if (ignorePops > 0) return;           // wait for our own back() to finish
    const need = needGuard();
    if (need && !armed) {
      history.pushState({ nexusGuard: true }, '');
      armed = true;
    } else if (!need && armed) {
      armed = false;
      ignorePops++;
      history.back();
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  }

  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--;
      sync();
      return;
    }
    armed = false;                         // the user consumed our entry
    const close = topOverlay();
    if (close) close();
    else if (App.State.getCurrentScreen() !== 'home') App.State.setCurrentScreen('home');
    sync();                                // another overlay still open? re-arm
  });

  // Watch overlays opening/closing and screen changes
  new MutationObserver(schedule).observe(document.body, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class']
  });
  App.State.subscribe(schedule);
  schedule();
})();

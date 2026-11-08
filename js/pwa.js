/**
 * NEXUS - PWA & Offline Service Worker Controller
 * Registers the service worker, shows a "New version available" bar after updates,
 * and powers the "Download NEXUS" card in the Command Hub (Android only).
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.PWA = (function() {
  let deferredInstallPrompt = null;

  function init() {
    registerServiceWorker();
    setupInstallEvents();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) return;

    // Only announce updates if the page was already controlled by an older worker
    const hadController = Boolean(navigator.serviceWorker.controller);

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('[NEXUS PWA] Service Worker registered:', reg.scope);
          // Look for a new version whenever the app returns to the foreground
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) reg.update().catch(() => {});
          });
          setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        })
        .catch(err => console.warn('[NEXUS PWA] SW registration failed:', err));
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) showUpdateNotice();
    });
  }

  function showUpdateNotice() {
    if (document.getElementById('nx-update-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'nx-update-bar';
    bar.className = 'nx-update-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `
      <span>New version available.</span>
      <button type="button" class="nexus-btn nexus-btn-primary nexus-btn-sm" id="nx-update-btn">TAP TO REFRESH</button>
      <button type="button" class="row-tool-btn" id="nx-update-dismiss" aria-label="Dismiss">×</button>`;
    document.body.appendChild(bar);
    document.getElementById('nx-update-btn').addEventListener('click', () => window.location.reload());
    document.getElementById('nx-update-dismiss').addEventListener('click', () => bar.remove());
  }

  // True only on Android devices
  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  // True when the app is already running as an installed app
  function isInstalled() {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );
    } catch (e) {
      return false;
    }
  }

  // True when the browser has offered a native install prompt
  function canPrompt() {
    return deferredInstallPrompt !== null;
  }

  function notifyStateChange() {
    window.dispatchEvent(new CustomEvent('nexus:install-state'));
  }

  function setupInstallEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      notifyStateChange();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      notifyStateChange();
      toast('NEXUS installed on your device!');
    });
  }

  // Called when the Download card in the Command Hub is tapped
  async function install() {
    if (isInstalled()) {
      toast('NEXUS is already installed.');
      return;
    }

    if (!deferredInstallPrompt) {
      if (window.location.protocol === 'file:') {
        toast('Open the hosted https link (not the local file) to install.');
      } else {
        toast('Open this link in Chrome, then menu > Install app.');
      }
      return;
    }

    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      console.log('[NEXUS PWA] Install choice:', choice.outcome);
    } catch (err) {
      console.warn('[NEXUS PWA] Install prompt failed:', err);
    }
    deferredInstallPrompt = null;
    notifyStateChange();
  }

  function toast(msg) {
    if (window.NexusApp.UI && window.NexusApp.UI.showToast) {
      window.NexusApp.UI.showToast(msg);
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast('Notifications enabled');
        } else {
          toast('Browser notifications blocked. In-app alerts remain active.');
        }
      });
    }
  }

  return {
    init,
    install,
    isInstalled,
    isAndroid,
    canPrompt,
    requestNotificationPermission
  };
})();

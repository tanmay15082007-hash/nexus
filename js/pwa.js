/**
 * NEXUS - PWA & Offline Service Worker Controller
 * Registers the service worker and powers the "Download NEXUS" card in the Command Hub.
 * The card is Android-only. There is no install banner and no iOS sheet.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.PWA = (function() {
  let deferredInstallPrompt = null;

  function init() {
    registerServiceWorker();
    setupInstallEvents();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[NEXUS PWA] Service Worker registered:', reg.scope);
          })
          .catch(err => {
            console.warn('[NEXUS PWA] SW registration failed:', err);
          });
      });
    }
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
        // Android browsers without a native prompt (or in-app browsers)
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
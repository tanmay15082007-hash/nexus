/**
 * NEXUS - The Command Hub & Core Orb Controller
 * Sections: PLAN, TRACK, SYSTEM, plus a RECENT row (last 3 features used).
 * A full-width "Download NEXUS" card shows at the top on Android only,
 * and disappears once the app is installed.
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Hub = (function() {
  const State = window.NexusApp.State;
  const Audio = window.NexusApp.Audio;

  const SECTIONS = [
    { id: 'plan', title: 'PLAN' },
    { id: 'track', title: 'TRACK' },
    { id: 'system', title: 'SYSTEM' }
  ];

  // Mobile = narrow screen or touch-first device
  function isMobileView() {
    try {
      return window.matchMedia('(max-width: 767px)').matches ||
             window.matchMedia('(pointer: coarse)').matches;
    } catch (e) {
      return false;
    }
  }

  // Download card: Android only, and never once the app is installed
  function isInstallAvailable() {
    const PWA = window.NexusApp.PWA;
    if (!PWA || !PWA.isAndroid || !PWA.isAndroid()) return false;
    return !(PWA.isInstalled && PWA.isInstalled());
  }

  const HUB_NODES = [
    // ---------------- PLAN ----------------
    {
      id: 'quickadd',
      section: 'plan',
      title: 'Quick Add',
      hint: 'Initialize a new directive right now',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
      action: () => {
        State.setCurrentScreen('home');
        closeHub();
        setTimeout(() => {
          const input = document.getElementById('home-quick-add-input');
          if (input) input.focus();
        }, 150);
      }
    },
    {
      id: 'calendar',
      section: 'plan',
      title: 'Calendar',
      hint: 'Month grid & browse any date',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-calendar');
      }
    },
    {
      id: 'week',
      section: 'plan',
      title: 'Week Board',
      hint: 'Multi-day timeline lanes & inter-day drag',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"></path><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>`,
      action: () => {
        State.setCurrentScreen('week');
        closeHub();
      }
    },
    {
      id: 'recurring',
      section: 'plan',
      title: 'Recurring',
      hint: 'Daily, weekday & monthly repeating routines',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-recurring');
      }
    },
    {
      id: 'lists',
      section: 'plan',
      title: 'Custom Lists',
      hint: 'Non-date collections & idea backlogs',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
      action: () => {
        State.setCurrentScreen('lists');
        closeHub();
      }
    },
    {
      id: 'transfer',
      section: 'plan',
      title: 'Transfer',
      hint: 'Move unfinished past tasks to today or future',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-transfer');
      }
    },

    // ---------------- TRACK ----------------
    {
      id: 'stats',
      section: 'track',
      title: 'Telemetry',
      hint: 'Velocity bars, 30-day heatmap & streak records',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
      action: () => {
        State.setCurrentScreen('stats');
        closeHub();
      }
    },
    {
      id: 'review',
      section: 'track',
      title: 'Weekly Review',
      hint: 'Completed, missed & best day of the week',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-review');
      }
    },
    {
      id: 'timer',
      section: 'track',
      title: 'Focus Timer',
      hint: '25/5 holographic Pomodoro ring',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-timer');
      }
    },
    {
      id: 'search',
      section: 'track',
      title: 'Search',
      hint: 'Filter directives by text, tag or priority',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      action: () => {
        State.setCurrentScreen('home');
        closeHub();
        setTimeout(() => {
          const searchInput = document.getElementById('home-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 150);
      }
    },

    // ---------------- SYSTEM ----------------
    {
      id: 'settings',
      section: 'system',
      title: 'Settings',
      hint: 'Appearance, sound, time, moniker & profile',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-settings');
      }
    },
    {
      id: 'backup',
      section: 'system',
      title: 'Data & Backup',
      hint: 'Export & import JSON telemetry backups',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-settings');
        switchSettingsTab('tab-backup');
      }
    },
    {
      id: 'help',
      section: 'system',
      title: 'Shortcuts',
      hint: 'Keyboard commands & navigation guide',
      // Keyboard shortcuts are not useful on touch devices
      visible: () => !isMobileView(),
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      action: () => {
        closeHub();
        openSlidePanel('panel-shortcuts');
      }
    }
  ];

  /* ---------------- Recent row ---------------- */
  const RECENT_KEY = 'nexus_recent_nodes';

  function getRecent() {
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(r) ? r : [];
    } catch (e) {
      return [];
    }
  }

  function pushRecent(id) {
    try {
      const r = getRecent().filter(x => x !== id);
      r.unshift(id);
      localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 3)));
    } catch (e) { /* storage unavailable */ }
  }

  function nodeHtml(node, sectionId) {
    return `
      <button type="button" class="hub-orbital-node" data-node-id="${node.id}" data-section="${sectionId}"
              tabindex="0" aria-label="${node.title}: ${node.hint}">
        <div class="node-icon-ring">${node.icon}</div>
        <span class="node-title">${node.title}</span>
        <span class="node-hint">${node.hint}</span>
      </button>`;
  }

  function init() {
    renderHubNodes();
    bindEvents();

    // Re-render when install state changes (prompt becomes available, or app installed)
    window.addEventListener('nexus:install-state', renderHubNodes);
    window.addEventListener('resize', renderHubNodes);
  }

  function renderHubNodes() {
    const gridEl = document.getElementById('command-hub-nodes-grid');
    if (!gridEl) return;

    const headerHtml = (id, title) => `<div class="hub-section-title" data-section-header="${id}"
        style="grid-column: 1 / -1; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; color: var(--text-dim); padding: 8px 2px 0;">${title}</div>`;
    const isVisible = (n) => typeof n.visible !== 'function' || n.visible();

    let html = '';

    // Full-width Download card at the very top (Android only)
    if (isInstallAvailable()) {
      html += `
        <button type="button" id="hub-install-card" class="hub-install-card"
                style="grid-column: 1 / -1;" aria-label="Download NEXUS as an app">
          <img src="assets/icons/icon-192.png" alt="" width="44" height="44" class="hub-install-icon">
          <span class="hub-install-text">
            <strong>Download NEXUS</strong>
            <small>Install it as an app with its own icon. Opens in its own window and works offline.</small>
          </span>
          <span class="hub-install-cta">DOWNLOAD</span>
        </button>`;
    }

    // Recent: last 3 features used
    const recent = getRecent()
      .map(id => HUB_NODES.find(n => n.id === id))
      .filter(n => n && isVisible(n));
    if (recent.length) {
      html += headerHtml('recent', 'RECENT');
      html += recent.map(n => nodeHtml(n, 'recent')).join('');
    }

    SECTIONS.forEach(section => {
      const nodes = HUB_NODES.filter(n => n.section === section.id && isVisible(n));
      if (!nodes.length) return;
      html += headerHtml(section.id, section.title);
      html += nodes.map(n => nodeHtml(n, section.id)).join('');
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll('.hub-orbital-node').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-node-id');
        const node = HUB_NODES.find(n => n.id === id);
        if (node && typeof node.action === 'function') {
          if (Audio) Audio.click();
          pushRecent(id);
          node.action();
        }
      });
    });

    const installCard = gridEl.querySelector('#hub-install-card');
    if (installCard) {
      installCard.addEventListener('click', () => {
        if (Audio) Audio.click();
        closeHub();
        if (window.NexusApp.PWA && window.NexusApp.PWA.install) {
          window.NexusApp.PWA.install();
        }
      });
    }
  }

  function openHub() {
    const hubOverlay = document.getElementById('command-hub-overlay');
    if (!hubOverlay) return;

    // Refresh tiles so Recent and the Download card reflect the current state
    renderHubNodes();

    hubOverlay.classList.add('active');
    document.body.classList.add('hub-active');
    State.setCommandHubOpen(true);
    if (Audio) Audio.hubOpen();

    const searchInput = document.getElementById('hub-quick-filter-input');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  function closeHub() {
    const hubOverlay = document.getElementById('command-hub-overlay');
    if (!hubOverlay) return;

    hubOverlay.classList.remove('active');
    document.body.classList.remove('hub-active');
    State.setCommandHubOpen(false);
  }

  function toggleHub() {
    if (State.isCommandHubOpen()) {
      closeHub();
    } else {
      openHub();
    }
  }

  function openSlidePanel(panelId) {
    closeAllPanels();
    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.classList.add('active');
    document.body.classList.add('panel-active');

    if (panelId === 'panel-calendar' && window.NexusApp.Calendar) {
      window.NexusApp.Calendar.init();
      window.NexusApp.Calendar.renderCalendar();
    } else if (panelId === 'panel-transfer' && window.NexusApp.UI) {
      window.NexusApp.UI.renderTransferPanel();
    } else if (panelId === 'panel-recurring' && window.NexusApp.UI) {
      window.NexusApp.UI.renderRecurringPanel();
    } else if (panelId === 'panel-timer' && window.NexusApp.Timer) {
      window.NexusApp.Timer.renderTimer();
    } else if (panelId === 'panel-review' && window.NexusApp.Extras) {
      window.NexusApp.Extras.renderReview();
    }
  }

  function closeSlidePanel(panelId) {
    if (panelId) {
      const p = document.getElementById(panelId);
      if (p) p.classList.remove('active');
    } else {
      closeAllPanels();
    }
    document.body.classList.remove('panel-active');
  }

  function closeAllPanels() {
    document.querySelectorAll('.nexus-slide-panel.active').forEach(p => p.classList.remove('active'));
    document.body.classList.remove('panel-active');
  }

  function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.settings-tab-pane').forEach(p => {
      p.style.display = (p.id === tabId) ? 'block' : 'none';
    });
  }

  // Filter tiles by text, and hide a section title when none of its tiles match
  function applyHubFilter(query) {
    const q = query.toLowerCase().trim();
    const visibleBySection = {};

    document.querySelectorAll('.hub-orbital-node').forEach(node => {
      const title = node.querySelector('.node-title').textContent.toLowerCase();
      const hint = node.querySelector('.node-hint').textContent.toLowerCase();
      const matches = title.includes(q) || hint.includes(q);
      node.style.display = matches ? 'flex' : 'none';
      if (matches) visibleBySection[node.getAttribute('data-section')] = true;
    });

    document.querySelectorAll('.hub-section-title').forEach(h => {
      const sec = h.getAttribute('data-section-header');
      h.style.display = visibleBySection[sec] ? '' : 'none';
    });

    // Download card: show when the search is empty or mentions install/download
    const card = document.getElementById('hub-install-card');
    if (card) {
      const match = !q || 'download install app'.includes(q) || q.includes('install') || q.includes('download');
      card.style.display = match ? '' : 'none';
    }
  }

  function bindEvents() {
    // Core Orb button click
    document.querySelectorAll('.nexus-core-orb-btn').forEach(b => b.addEventListener('click', toggleHub));

    // Hub Close Button
    const hubCloseBtn = document.getElementById('hub-close-btn');
    if (hubCloseBtn) hubCloseBtn.addEventListener('click', closeHub);

    // Hub Backdrop click
    const hubOverlay = document.getElementById('command-hub-overlay');
    if (hubOverlay) {
      hubOverlay.addEventListener('click', (e) => {
        if (e.target === hubOverlay) closeHub();
      });
    }

    // Slide Panel Close Buttons
    document.querySelectorAll('.panel-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.nexus-slide-panel');
        if (panel) closeSlidePanel(panel.id);
      });
    });

    // Panel backdrop click
    document.querySelectorAll('.nexus-slide-panel').forEach(panel => {
      panel.addEventListener('click', (e) => {
        if (e.target === panel) closeSlidePanel(panel.id);
      });
    });

    // Hub filter search input
    const filterInput = document.getElementById('hub-quick-filter-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => applyHubFilter(e.target.value));
    }

    // Settings tab buttons
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchSettingsTab(tab);
      });
    });
  }

  return {
    init,
    openHub,
    closeHub,
    toggleHub,
    openSlidePanel,
    closeSlidePanel,
    closeAllPanels,
    switchSettingsTab,
    HUB_NODES
  };
})();

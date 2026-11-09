/**
 * NEXUS - Command Palette Engine (Ctrl / Cmd + K)
 * Fast fuzzy-action navigator with keyboard arrow traversal and instant execution
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Palette = (function() {
  const State = window.NexusApp.State;
  const Hub = window.NexusApp.Hub;
  const Audio = window.NexusApp.Audio;

  const COMMANDS = [
    {
      id: 'cmd-new-task',
      title: 'Add New Directive',
      keywords: 'create new task directive schedule mission',
      category: 'Directives',
      icon: '✚',
      run: () => window.NexusApp.UI.openTaskEditModal()
    },
    {
      id: 'cmd-today',
      title: 'Navigate to Today',
      keywords: 'today home directives dashboard current day',
      category: 'Navigation',
      icon: '⦿',
      run: () => {
        State.setCurrentScreen('home');
        State.setSelectedDate(window.NexusApp.Dates.getTodayStr());
      }
    },
    {
      id: 'cmd-calendar',
      title: 'Open Tactical Calendar',
      keywords: 'calendar month view date picker schedule dates',
      category: 'Navigation',
      icon: '📅',
      run: () => Hub.openSlidePanel('panel-calendar')
    },
    {
      id: 'cmd-week',
      title: 'Open Week Timeline Board',
      keywords: 'week board multi-day horizon lanes 7 days',
      category: 'Navigation',
      icon: '📊',
      run: () => State.setCurrentScreen('week')
    },
    {
      id: 'cmd-transfer',
      title: 'Transfer Pending Tasks',
      keywords: 'transfer move copy unfinished pending carry over overdue',
      category: 'Directives',
      icon: '⇄',
      run: () => Hub.openSlidePanel('panel-transfer')
    },
    {
      id: 'cmd-recurring',
      title: 'Open Recurring Routines',
      keywords: 'recurring routines repeat daily weekly habits automated',
      category: 'Directives',
      icon: '🔁',
      run: () => Hub.openSlidePanel('panel-recurring')
    },
    {
      id: 'cmd-lists',
      title: 'Open Custom Directive Lists',
      keywords: 'custom lists ideas groceries backlog collections',
      category: 'Navigation',
      icon: '📋',
      run: () => State.setCurrentScreen('lists')
    },
    {
      id: 'cmd-stats',
      title: 'View Telemetry & Stats',
      keywords: 'stats telemetry metrics streak heatmap charts velocity',
      category: 'Navigation',
      icon: '📈',
      run: () => State.setCurrentScreen('stats')
    },
    {
      id: 'cmd-review',
      title: 'Open Weekly Review',
      keywords: 'weekly review summary completed missed best day plan',
      category: 'Navigation',
      icon: '✔',
      run: () => Hub.openSlidePanel('panel-review')
    },
    {
      id: 'cmd-timer',
      title: 'Engage Focus Pomodoro Timer',
      keywords: 'focus timer pomodoro countdown 25 5 break clock',
      category: 'Focus',
      icon: '⏱',
      run: () => Hub.openSlidePanel('panel-timer')
    },
    {
      id: 'cmd-overdue',
      title: 'Move All Overdue to Today',
      keywords: 'overdue resolve move today yesterday pending past',
      category: 'Directives',
      icon: '⚡',
      run: () => window.NexusApp.Tasks.moveAllOverdueToToday()
    },
    {
      id: 'cmd-export',
      title: 'Export Telemetry JSON Backup',
      keywords: 'export backup download save json storage file',
      category: 'Data & Backup',
      icon: '💾',
      run: () => {
        window.NexusApp.Storage.exportJSON(State.getData());
        window.NexusApp.UI.showToast('Telemetry backup exported');
      }
    },
    {
      id: 'cmd-import',
      title: 'Import Telemetry JSON Backup',
      keywords: 'import restore upload load json backup',
      category: 'Data & Backup',
      icon: '📥',
      run: () => {
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) fileInput.click();
      }
    },
    {
      id: 'cmd-theme-cyan',
      title: 'Set Holographic Accent: Cyan',
      keywords: 'theme color accent cyan blue neon appearance',
      category: 'Appearance',
      icon: '🔵',
      run: () => applyTheme('cyan')
    },
    {
      id: 'cmd-theme-violet',
      title: 'Set Holographic Accent: Violet',
      keywords: 'theme color accent violet purple appearance',
      category: 'Appearance',
      icon: '🟣',
      run: () => applyTheme('violet')
    },
    {
      id: 'cmd-theme-gold',
      title: 'Set Holographic Accent: Gold',
      keywords: 'theme color accent gold amber yellow appearance',
      category: 'Appearance',
      icon: '🟡',
      run: () => applyTheme('gold')
    },
    {
      id: 'cmd-theme-green',
      title: 'Set Holographic Accent: Green',
      keywords: 'theme color accent green matrix emerald appearance',
      category: 'Appearance',
      icon: '🟢',
      run: () => applyTheme('green')
    },
    {
      id: 'cmd-theme-red',
      title: 'Set Holographic Accent: Red',
      keywords: 'theme color accent red crimson appearance',
      category: 'Appearance',
      icon: '🔴',
      run: () => applyTheme('red')
    },
    {
      id: 'cmd-sound-toggle',
      title: 'Toggle Audio Synthesizer Beeps',
      keywords: 'sound audio mute volume beeps effects',
      category: 'Settings',
      icon: '🔊',
      run: () => {
        const s = State.getSettings();
        State.updateSettings({ soundEnabled: !s.soundEnabled });
        window.NexusApp.UI.showToast(`Audio synthesizer: ${!s.soundEnabled ? 'ONLINE' : 'MUTED'}`);
      }
    },
    {
      id: 'cmd-settings',
      title: 'Open Settings Deck',
      keywords: 'settings preferences profile configuration moniker',
      category: 'Settings',
      icon: '⚙',
      run: () => Hub.openSlidePanel('panel-settings')
    },
    {
      id: 'cmd-shortcuts',
      title: 'View Keyboard Shortcuts',
      keywords: 'help shortcuts keybindings hotkeys info guide',
      category: 'Help',
      icon: '⌨',
      run: () => Hub.openSlidePanel('panel-shortcuts')
    }
  ];

  let selectedIndex = 0;
  let filteredCommands = [...COMMANDS];

  function applyTheme(color) {
    State.updateSettings({ accentColor: color });
    document.documentElement.setAttribute('data-theme', color);
    window.NexusApp.UI.showToast(`Accent calibrated to ${color.toUpperCase()}`);
  }

  function init() {
    bindEvents();
  }

  function openPalette() {
    const modal = document.getElementById('command-palette-modal');
    if (!modal) return;

    modal.classList.add('active');
    State.setCommandPaletteOpen(true);
    if (Audio) Audio.click();

    const input = document.getElementById('palette-search-input');
    if (input) {
      input.value = '';
      filterCommands('');
      setTimeout(() => input.focus(), 80);
    }
  }

  function closePalette() {
    const modal = document.getElementById('command-palette-modal');
    if (!modal) return;

    modal.classList.remove('active');
    State.setCommandPaletteOpen(false);
  }

  function togglePalette() {
    if (State.isCommandPaletteOpen()) {
      closePalette();
    } else {
      openPalette();
    }
  }

  function filterCommands(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      filteredCommands = [...COMMANDS];
    } else {
      filteredCommands = COMMANDS.filter(cmd => {
        return cmd.title.toLowerCase().includes(q) ||
               cmd.keywords.toLowerCase().includes(q) ||
               cmd.category.toLowerCase().includes(q);
      });
    }

    selectedIndex = 0;
    renderList();
  }

  function renderList() {
    const listEl = document.getElementById('palette-results-list');
    if (!listEl) return;

    if (filteredCommands.length === 0) {
      listEl.innerHTML = '<div class="palette-empty-note">No matching commands found.</div>';
      return;
    }

    listEl.innerHTML = filteredCommands.map((cmd, idx) => `
      <div class="palette-item ${idx === selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <span class="palette-item-icon">${cmd.icon}</span>
        <div class="palette-item-info">
          <span class="palette-item-title">${cmd.title}</span>
          <span class="palette-item-cat">${cmd.category}</span>
        </div>
        <kbd class="palette-item-kbd">↵</kbd>
      </div>
    `).join('');

    listEl.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        executeCommand(idx);
      });
    });
  }

  function executeCommand(index) {
    const cmd = filteredCommands[index];
    if (cmd && typeof cmd.run === 'function') {
      closePalette();
      if (Audio) Audio.click();
      cmd.run();
    }
  }

  function bindEvents() {
    const modal = document.getElementById('command-palette-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closePalette();
      });
    }

    const input = document.getElementById('palette-search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        filterCommands(e.target.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (filteredCommands.length) selectedIndex = (selectedIndex + 1) % filteredCommands.length;
          renderList();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (filteredCommands.length) selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
          renderList();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeCommand(selectedIndex);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePalette();
        }
      });
    }

    // Global shortcut Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
    });
  }

  return {
    init,
    openPalette,
    closePalette,
    togglePalette,
    COMMANDS
  };
})();

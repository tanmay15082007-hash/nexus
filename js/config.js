/**
 * NEXUS - System Configuration & Constants
 * Single Source of Truth for App Branding & Schema Versioning
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Config = {
  // SINGLE CONFIG CONSTANT: Change here to rebrand the entire application
  APP_NAME: 'NEXUS',
  APP_SUBTITLE: 'Holographic Command Deck & Task Operations',
  STORAGE_KEY: 'nexus_v1',
  SCHEMA_VERSION: 1,

  DEFAULT_SETTINGS: {
    userName: 'Commander',
    accentColor: 'cyan', // 'cyan' | 'violet' | 'gold' | 'green' | 'red'
    soundEnabled: false, // Off by default as required
    animationsEnabled: true,
    timeFormat: '24',    // '12' | '24'
    weekStart: 'mon',    // 'mon' | 'sun'
    showBootAnimation: true
  },

  PRIORITIES: {
    critical: { label: 'Critical', order: 1, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)' },
    high:     { label: 'High',     order: 2, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    medium:   { label: 'Medium',   order: 3, color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
    low:      { label: 'Low',      order: 4, color: '#64748b', glow: 'rgba(100, 116, 139, 0.3)' }
  },

  DEFAULT_TAGS: [
    { id: 'work',        name: 'Work',        color: '#38bdf8' },
    { id: 'dev',         name: 'Development', color: '#a855f7' },
    { id: 'fitness',     name: 'Fitness',     color: '#10b981' },
    { id: 'research',    name: 'Research',    color: '#ec4899' },
    { id: 'personal',    name: 'Personal',    color: '#fbbf24' }
  ],

  POMODORO: {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  },

  QUOTES: [
    "Command your day with precision and focus.",
    "Every mission begins with a single directive.",
    "Order and clarity turn vision into momentum.",
    "Telemetry is optimal. Directives are clear.",
    "Discipline is the engine of high achievement.",
    "Focus your energy on high-impact objectives.",
    "Action creates clarity where contemplation creates doubt.",
    "Your future is crafted in daily operational routines."
  ]
};

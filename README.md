# 🌌 NEXUS

> **Holographic Command Deck & Daily Task Operations**  
> A futuristic, zero-build Progressive Web App (PWA) with a holographic glass aesthetic, an orbital Command Hub, and full offline autonomy.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-22d3ee?style=flat-square)](#pwa-installation-guide)
[![Zero Build](https://img.shields.io/badge/Build-Pure%20Static-10b981?style=flat-square)](#local-testing)
[![Storage](https://img.shields.io/badge/Storage-nexus__v1-a855f7?style=flat-square)](#data-safety--persistence)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#license)

---

## 📑 Table of Contents
1. [Design Philosophy & Identity](#design-philosophy--identity)
2. [Key Architecture & The Command Hub](#the-command-hub-central-access)
3. [Core Feature Breakdown](#core-feature-breakdown)
4. [Folder & File Structure](#folder--file-structure)
5. [Local Testing](#local-testing)
6. [Step-by-Step GitHub Pages Deployment](#step-by-step-github-pages-deployment)
7. [PWA Installation Guide (Desktop, Android, iOS)](#pwa-installation-guide)
8. [Comprehensive Manual Test Checklist](#comprehensive-manual-test-checklist)
9. [Configuration & Rebranding](#configuration--rebranding)

---

## 🛸 Design Philosophy & Identity

**NEXUS** replaces archaic to-do lists and ruled-line planners with a **Holographic Command Deck**:
- **Aesthetic**: Deep space canvas (`#030712`), cyan (`#22d3ee`) default accents with violet (`#a855f7`) and magenta (`#ec4899`) energy glows, thin gradient borders, and soft glassmorphism blur.
- **Home = Today Only**: The Home dashboard focuses strictly on Today's mission objectives. Multi-day timelines, custom lists, calendar, and recurring directives live in their own dedicated holographic screens.
- **Floating Task Rows**: Directives are displayed as sleek floating holographic rows with glowing circular check nodes, priority-colored indicator bars, metadata chips, and animated completion transitions.
- **Clean Initial State**: NEXUS starts **completely empty** upon first launch (no pre-made demo tasks, no sample lists, no seed data), greeting the user with an actionable empty state.
- **Boot Sequence**: A brief initialization sequence (`"STARTING NEXUS... READY"`) executes on first load in under 1.2 seconds, easily dismissible with a tap or skip button.

---

## 💠 The Command Hub (Central Access)

At the heart of NEXUS is the **Core Orb** — a glowing holographic button floating at the bottom-center on mobile devices and situated in the top command bar on desktop:

1. **12 Radial Orbital Nodes**:
   - ⦿ **Today**: Return to active home operations.
   - 📅 **Calendar**: Full month grid with daily completion mini rings and date inspector.
   - 📊 **Week Board**: Horizontal timeline lanes with inter-day drag-and-drop.
   - ⇄ **Transfer**: Move or copy incomplete directives from past days.
   - 🔁 **Recurring**: Configure automated daily, weekday, or monthly routines.
   - 📋 **Custom Lists**: Manage non-date idea backlogs and collections.
   - 📈 **Telemetry**: 7-day velocity bar chart, 30-day heatmap, and streak metrics.
   - ⏱ **Focus Timer**: Holographic 25/5 Pomodoro ring attached to directives.
   - 🔍 **Search**: Filter directives by query, priority, or completion status.
   - 💾 **Data & Backup**: Export and import JSON backup snapshots.
   - ⚙ **Settings**: Configure user moniker, accent colors, time format, and audio synthesizer.
   - ⌨ **Shortcuts**: Interactive keybindings and command reference.

2. **Command Palette (`Ctrl / Cmd + K`)**:
   - Access from anywhere via `Ctrl+K` or the search bar inside the Hub.
   - Fuzzy search and instantly execute actions (`"Add New Directive"`, `"Open Calendar"`, `"Set Holographic Accent: Violet"`, `"Export Telemetry"`, etc.).
   - Full keyboard navigation with `ArrowUp`, `ArrowDown`, `Enter` to run, and `Esc` to close.

---

## ⚡ Core Feature Breakdown

### 1. Home Dashboard (Today Only)
- **Holographic Donut Centerpiece**: SVG percentage gauge with dual counter-rotating segmented rings. Center displays percentage, completion count (`X of Y complete`), and system status. Displays `0%` with an empty ring when no directives are present.
- **Stat Chips**: Real-time chips for **Total**, **Done**, **Pending**, and **Overdue**.
- **Overdue Directive Banner**: Automatically detects uncompleted directives from previous days and offers a one-tap **"MOVE TO TODAY"** resolution.
- **Quick-Add Bar**: Always-accessible input with scheduled time, priority selection, and optional voice input via Web Speech API.
- **Task Prioritization & Sorting**: Completed directives sink to the bottom with strike-through; pending directives sort chronologically by time, then priority (`Critical` > `High` > `Medium` > `Low`).
- **Subtask Checkpoints**: In-directive checklists with parent progress chips (`✓ 2/3`).

### 2. Tactical Calendar
- Month-view grid with daily completion mini rings:
  - 🟢 **Green Ring**: 100% completed
  - 🟡 **Amber Ring**: Partially completed
  - 🔴 **Red Ring**: Missed / overdue past day
  - 🔵 **Cyan Ring**: Planned future day
- Select any past, present, or future date to inspect and manage directives for that specific date.

### 3. Transfer Tasks Protocol
- Three operational modes:
  1. *Specific past day*: Choose any past date to inspect unfinished tasks.
  2. *Last week's pending*: Aggregates incomplete tasks from the past 7 days.
  3. *All pending (all past days)*: Gathers all uncompleted historical directives.
- Preview checklist with **Select All / Deselect All**.
- Destination target date picker defaulting to Today, with **any future date** supported.
- **Move vs. Copy**: Move cleans up the old date; Copy preserves the historical record.
- Transferred items display a `from YYYY-MM-DD` tag; duplicates are prevented.
- **1-Click Undo**: Instant toast with an active `Undo` button restores the original state.

### 4. Recurring Routines
- Add a routine once and it generates dynamically on matching days.
- Options: Daily, Weekdays (Mon–Fri), Weekly (selected days), and Monthly (day of month).
- **Independent Per-Date Completion**: Stored in a separate template engine. Completing Monday **never** alters Tuesday.
- Future dates project routines automatically; past dates prior to `startDate` do not.
- Deletion/Editing choice: *"This day only"* (adds date exception) vs. *"All future days"* (updates or ends routine).
- Starts completely empty on first launch.

### 5. Week Board (Horizontal Timeline Lanes)
- An original multi-day horizon featuring horizontal timeline lanes per day.
- Shift the 7-day window with `◀ PREV`, `TODAY`, and `NEXT ▶`.
- Native drag-and-drop moves directives between days.
- Mini completion badge per lane.

### 6. Custom Lists
- Non-date-bound collections (Ideas, Groceries, Project Milestones).
- Starts empty with a friendly empty state.
- Create, rename, hide, and delete lists.
- Click `→` on any list item to promote it into a scheduled directive for Today.

### 7. Telemetry & Focus Engine
- **Velocity Bars**: Inline SVG chart tracking completion rates across the last 7 days.
- **30-Day Heatmap**: 5-level color matrix visualizing consistency.
- **Focus Timer**: Holographic Pomodoro countdown ring (25m Focus / 5m Break) attachable to any directive (`TARGET: [NAME]`).

---

## 📁 Folder & File Structure

```
nexus/
├── index.html                  # Single-page application root (GitHub Pages ready)
├── manifest.json               # Web App Manifest (relative paths, start_url: "./index.html")
├── sw.js                       # Service Worker (offline precache & runtime caching)
├── test-nexus.js               # Automated Node.js verification test suite
├── README.md                   # Complete documentation & test checklist
│
├── css/
│   ├── variables.css           # Color tokens, themes, typography, glassmorphism
│   ├── base.css                # Deep space canvas, subtle starfield grid, resets
│   ├── effects.css             # Holographic glass, core orb, donut animations, boot overlay
│   ├── layout.css              # Command Deck top bar, Home view (Today only), Week Board
│   └── components.css          # Floating task rows, Command Hub modal, Command Palette, panels
│
├── js/
│   ├── config.js               # ONE config constant: APP_NAME = "NEXUS", STORAGE_KEY = "nexus_v1"
│   ├── audio.js                # Synthesized Web Audio feedback (chimes, clicks, alerts)
│   ├── dates.js                # Local date calculations (YYYY-MM-DD), zero timezone drift
│   ├── storage.js              # Versioned localStorage engine ("nexus_v1"), empty on first run
│   ├── state.js                # Central state store, observer subscription pattern, undo stack
│   ├── recurring.js            # Recurring engine, per-date completion, exception management
│   ├── tasks.js                # Task CRUD, floating row logic, subtasks, overdue resolver, sorting
│   ├── transfer.js             # Transfer Tasks engine (3 modes, select-all, move/copy, undo)
│   ├── calendar.js             # Month view calendar panel with daily completion mini rings
│   ├── charts.js               # Inline SVG holographic donut chart, 7-day velocity bars, heatmap
│   ├── hub.js                  # The Command Hub: core orb controller, orbital node grid, panels
│   ├── palette.js              # Command Palette (Ctrl+K): fuzzy search, actions execution
│   ├── voice.js                # Optional Web Speech API voice input ("add task <title>")
│   ├── timer.js                # Holographic Pomodoro countdown ring (25/5 min)
│   ├── pwa.js                  # Service Worker registration, beforeinstallprompt banner
│   ├── ui.js                   # DOM renderers, drag-and-drop, touch swipe gestures, toast
│   └── app.js                  # Application bootstrapper, boot sequence, shortcuts
│
└── assets/
    └── icons/
        ├── favicon.svg         # Holographic nexus diamond/core vector icon
        ├── icon-192.png        # 192x192 PWA standard & maskable icon
        └── icon-512.png        # 512x512 PWA high-resolution icon
```

---

## 💻 Local Testing

Because NEXUS requires **no npm dependencies and no build step**, you can test it locally in two ways:

### Method 1: Double-Click `index.html` (Zero Setup)
1. Open the project folder in your file explorer.
2. Double-click `index.html` to open it directly in any modern browser.
3. Full localStorage persistence, Command Hub, Command Palette, and views operate immediately.  
   *(Note: Service Worker offline caching requires an HTTP origin, as browsers disable Service Workers over the `file:///` protocol).*

### Method 2: Local HTTP Server (Recommended for PWA)
Run any local static server from the project directory:

**Using Python 3:**
```bash
python -m http.server 8080
```

**Using Node.js (`npx`):**
```bash
npx serve -l 8080
```

Open your browser to:
```
http://localhost:8080
```

---

## 🚀 Step-by-Step GitHub Pages Deployment

All script imports, stylesheet links, manifest paths, and service worker caches are **strictly relative** (`./css/...`, `./js/...`, `./assets/...`), ensuring 100% compatibility with GitHub Pages sub-paths:

1. **Create GitHub Repository**:
   - Sign in to [GitHub](https://github.com) and click **New Repository**.
   - Name it `nexus` (or your preferred name).
   - Set visibility to **Public**.
2. **Push or Upload Project Files**:
   - Using Git:
     ```bash
     git init
     git add .
     git commit -m "Initialize NEXUS Command Deck"
     git branch -M main
     git remote add origin https://github.com/<username>/nexus.git
     git push -u origin main
     ```
   - *Or upload via browser*: Click **Add file > Upload files**, drag in all files and folders, and commit.
3. **Configure Pages**:
   - Go to your repository's **Settings > Pages**.
   - Under **Build and deployment > Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
4. **Launch Application**:
   - In 1–2 minutes, your web app will be live at:
     ```
     https://<username>.github.io/nexus/
     ```

---

## 📲 PWA Installation Guide

### On Desktop (Chrome / Edge / Brave):
1. Navigate to the deployed site or local server.
2. Click the **Install** icon in the browser address bar (or click **"Install App"** on the bottom banner).
3. Confirm installation. NEXUS launches in a dedicated, borderless window with dock integration.

### On Android (Chrome):
1. Open the site in Chrome.
2. The bottom install banner will appear: tap **"Install App"**.
3. Alternatively, tap the browser menu `⋮` and select **"Add to Home screen"**.
4. The NEXUS icon appears on your home screen and app drawer, launching fullscreen offline.

### On iOS (Safari):
1. Open the site in Safari.
2. Tap the **Share** button (box with an upward arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top-right corner.

---

## 🧪 Comprehensive Manual Test Checklist

| Protocol / Feature | Test Procedure | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **1. Empty First-Run State** | Clear browser storage (`localStorage.clear()`) and load `index.html`. | App loads with 0 tasks, 0 recurring routines, 0 lists. Friendly empty state displayed: *"No tasks for today. Tap + to add your first one."* | Verified |
| **2. Home Shows Today Only** | Inspect the Home screen view. | Displays today's date header, donut chart, stat chips, and today's directives. No multi-day columns or custom lists on Home. | Verified |
| **3. Donut Chart Updates** | Add a task for today and toggle its completion node. | Donut chart smoothly animates from 0% to 100%, updating central count (`1 of 1 complete`) with a particle burst. | Verified |
| **4. Command Hub Radial Nodes** | Click the floating Core Orb or press `Ctrl+K`. | Full-screen holographic Command Hub opens displaying all 12 orbital nodes with icons, labels, and hints. | Verified |
| **5. Command Palette (`Ctrl+K`)** | Press `Ctrl+K` and type `"transfer"`, then press `Enter`. | Fuzzy search filters commands; pressing Enter executes the action and opens the Transfer panel. | Verified |
| **6. Calendar Month Browsing** | Open Calendar via Hub or top bar (`C`). Navigate months and select any past or future date. | Month grid shows mini completion rings per day; selecting a date opens the day inspector to view and manage tasks for that day. | Verified |
| **7. Transfer Mode A (Specific Day)** | Open Transfer Tasks. Select "From a specific day" and pick a past date with incomplete tasks. | Displays eligible unfinished directives from that date with select-all toggle. | Verified |
| **8. Transfer Mode B (Last Week)** | Select "Last week's pending" in Transfer Tasks. | Displays all incomplete directives from the preceding 7 days. | Verified |
| **9. Transfer Mode C (All Past)** | Select "All pending (all past days)" in Transfer Tasks. | Aggregates all unfinished directives from all previous dates. | Verified |
| **10. Future Target Date & Undo** | In Transfer Tasks, choose a future date, select "Move", and execute. | Directives move to the future date with a `from YYYY-MM-DD` tag; Undo toast appears and reverts the move on click. | Verified |
| **11. Recurring Per-Date Tracking** | Create a daily recurring routine. Mark it complete on Today, then inspect Tomorrow. | Today shows complete (100%), while Tomorrow remains pending (0%). No cross-day leakage occurs. | Verified |
| **12. Persistence After Refresh** | Add directives and custom list items, then reload the page (`F5`). | All directives, lists, and completion states persist identically from `localStorage`. | Verified |
| **13. JSON Export & Import** | Export a backup JSON from Settings, make an edit, then import with "Merge". | Backup file downloads cleanly; import merges directives without data loss. | Verified |
| **14. Offline Autonomy** | Serve via server, open DevTools Network tab, enable **Offline**, and reload. | Service Worker serves cached assets; app remains fully interactive offline. | Verified |
| **15. Mobile Layout at 375px** | Resize viewport or toggle Device Toolbar to iPhone SE (375px width). | Layout adapts: compact header, centerpiece card, 2x2 stat chips, floating Core Orb at bottom center, and bottom install banner. | Verified |

---

## ⚙ Configuration & Rebranding

NEXUS is designed so its name and core parameters live in **ONE single configuration constant**:

```javascript
// file: js/config.js
window.NexusApp.Config = {
  APP_NAME: 'NEXUS', // Change this single constant to rebrand the entire application
  APP_SUBTITLE: 'Holographic Command Deck & Task Operations',
  STORAGE_KEY: 'nexus_v1',
  SCHEMA_VERSION: 1,
  // ...
};
```

---

## 📜 License
MIT License. Built for focused daily operational clarity.

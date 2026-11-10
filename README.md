# 🛸 NEXUS

A futuristic daily task manager that runs entirely in your browser. No account, no server, no build step. Your data stays on your device. 🔒

🌐 **Live app:** https://tanmay15082007-hash.github.io/nexus/

---

## ✨ Features

### 📋 Daily planning
- 🎯 **Today dashboard:** animated progress ring, stat cards (Total, Done, Pending, Overdue), and today's task list only.
- ⚡ **Smart quick add:** type `gym tomorrow 6pm high #fitness` and NEXUS fills in the date, time, priority and tag. A preview shows what it understood before you add.
- ⭐ **Focus 3:** pin up to three tasks with the star button. They appear first, shown larger.
- ✅ **Subtasks, notes, priority and tags** on every task.
- 🚨 **Overdue strip** and a 🌅 **morning check-in** that offers to move unfinished tasks to today (once per day).
- ↩️ **Undo** for deleted tasks, deleted routines and transfers.
- ⇄ **Move to another day** button on each task (works on touch screens).

### 📅 Calendar and week
- 🗓️ **Calendar:** 7-column month view, colour dots for each task, green glow when a day is fully done, tap any date to view, edit or add tasks.
- 🧭 **Week board:** seven day lanes, drag tasks between days (desktop).
- 🔄 **Transfer tasks:** move or copy unfinished tasks from one day, the last 7 days, or all past days to today or any future date.

### 🔁 Recurring routines
- 📆 Daily, weekdays, weekly (choose the days) and monthly (choose the date), with start and end dates.
- 🧩 Completion is tracked **per day** (finishing Monday does not finish Tuesday).
- ✏️ Edit, ⏸️ pause, ▶️ resume and 🗑️ delete routines.
- 🔥 Streak counter and a 7-day history for each routine.
- 📦 Compact list: tap a row to open its actions, 🔎 search appears when you have more than 5 routines, and the "new routine" form is collapsed until needed.

### 📊 Insight
- 📈 **Telemetry (stats):** 7-day bars, a 30-day matrix (calendar-style grid with colour key and tap-for-details), current streak, best streak, completion rate and most productive day.
- 📝 **Weekly review:** completed, missed, completion rate and best day, plus a day-by-day breakdown. Suggested automatically on Sundays.
- 🏷️ Progress shown in the browser tab title, for example `(60%) NEXUS`, and as an app badge on supported Android devices.

### 🧰 Lists, tools and comfort
- 🗒️ **Custom lists:** create, rename, hide, show, reorder and delete lists. Promote an item to today's tasks.
- ⏱️ **Focus timer:** 25/5 Pomodoro with a ring display.
- 🔔 **Reminders:** an alert for timed tasks while the app is open, plus system notifications if you allow them.
- 🧠 **Command Hub:** one place for every feature, grouped as PLAN, TRACK and SYSTEM, with a RECENT row for your last three features.
- ⌨️ **Command palette:** press `Ctrl + K` (or `Cmd + K`) to jump to any action.
- 💬 **In-app dialogs** replace the browser's alert, confirm and prompt boxes.
- ⚙️ **Settings:** name, accent colour 🎨, high-contrast mode, 12 or 24-hour time, week start, sound 🔊, animations and haptic vibration 📳.
- 💾 **Backup:** export and import JSON (merge or replace) and a double-confirmed reset.
- ♿ **Accessibility:** focus rings, labels on controls, keyboard control of tasks, reduced-motion support and a high-contrast option.

### 📱 Mobile and install
- 🧭 Bottom navigation bar (Today, Calendar, Add, Stats, Hub) appears on phones only.
- 👆 Swipe a task right to complete it and left to delete it (vertical scrolling still works).
- 📲 **Install as an app (Android):** open the Command Hub and tap **Download NEXUS**. It installs to the home screen and works offline.
- 🆕 A **New version available** bar appears when an update is published.

---

## ⌨️ Keyboard shortcuts (desktop)

| Key | Action |
|---|---|
| `N` | ➕ New task |
| `T` | 🏠 Back to Today |
| `C` | 🗓️ Open calendar |
| `R` | 🔁 Open recurring routines |
| `/` | 🔎 Focus search |
| `Ctrl + K` | ⚡ Command palette |
| `Ctrl + Z` | ↩️ Undo last delete or transfer |
| `?` | ❓ Shortcuts help |
| `Esc` | ❌ Close the open panel |
| `Space` / `Enter` / `Delete` | On a focused task: complete / edit / remove |

---

## 🗂️ Project structure

```
nexus/
├── index.html
├── manifest.json
├── sw.js                    Service worker (offline + updates)
├── README.md
├── css/
│   ├── variables.css        Colours, fonts, themes
│   ├── base.css
│   ├── effects.css
│   ├── layout.css           Top bar, home, week board, lists
│   ├── components.css       Tasks, hub, panels, calendar, bottom nav
│   └── nexus-ui.css         Dialogs, review, matrix, recurring list, accessibility
├── js/
│   ├── config.js
│   ├── audio.js
│   ├── dates.js
│   ├── storage.js           localStorage load/save/export/import
│   ├── state.js             Central state store
│   ├── recurring.js         Recurring routine engine
│   ├── tasks.js             Task logic, sorting, undo
│   ├── transfer.js
│   ├── calendar.js
│   ├── charts.js            Progress ring, bars, 30-day matrix, streaks
│   ├── hub.js               Command Hub
│   ├── palette.js           Command palette
│   ├── dialog.js            In-app dialogs
│   ├── timer.js
│   ├── pwa.js               Service worker, install, update bar
│   ├── ui.js                Screens and panels
│   ├── recurring-ui.js      Compact recurring panel
│   ├── extras.js            Quick-add parser, Focus 3, reminders, review
│   └── app.js               Startup and shortcuts
├── assets/icons/            App icons
└── tools/                   Optional developer scripts (not needed by the site)
    ├── generate-icons.js
    └── test-nexus.js
```

⚠️ Script order in `index.html` matters. `recurring-ui.js` loads right after `ui.js`, and `extras.js` after that.

---

## 💻 Run it locally

The install and offline features need `http://localhost` or HTTPS. Opening `index.html` directly works for viewing, but not for install.

```bash
# in the project folder, pick one
python -m http.server 8000
npx serve
```

Then open `http://localhost:8000`.

🧪 Optional checks:

```bash
node tools/test-nexus.js
```

---

## 🚀 Deploy to GitHub Pages

1. 📁 Create a public repository, for example `nexus`.
2. ⬆️ Upload the project so `index.html` is at the **root** (drag the `css`, `js` and `assets` folders in too).
3. ⚙️ Go to **Settings → Pages**.
4. 🌿 Source: **Deploy from a branch**. Branch: **main**. Folder: **/ (root)**. Save.
5. ⏳ After about a minute your site is live at `https://<username>.github.io/<repo>/`.

All paths in the project are relative, so it works from a sub-path like `/nexus/`.

### 🔄 Publishing updates

1. ✏️ Change your files.
2. 🔢 Raise the version in `sw.js`, for example `nexus-v2.3.1`. Without this, phones keep showing the old cached version.
3. 📦 Upload every changed file in **one commit** (several quick commits cancel each other's builds).
4. ✅ Wait for the green check under **Actions**.
5. 🔁 Reopen the app. Installed apps show the **New version available** bar; tap **Tap to refresh**.

❌ A red cross next to a commit usually means that build was cancelled by a newer commit. Open **Details** to confirm.

---

## 📲 Install as an app

- 🤖 **Android (Chrome):** open the site, wait a few seconds, open the Command Hub (Hub button) and tap **Download NEXUS**.
- 🍎 **iPhone:** Safari does not offer an install prompt. Use Share → Add to Home Screen.
- 🖥️ **Desktop Chrome, Edge or Brave:** use the install icon in the address bar.

---

## 🔐 Your data

- 💾 Everything is stored in your browser's `localStorage`. Nothing is sent anywhere.
- 🔀 Data **does not sync** between your phone and laptop. Use **Settings → Data & Backup → Export JSON** and Import to move it.
- ⚠️ Clearing site data deletes your tasks. Export a backup now and then.
- 📌 Pins (Focus 3), reminder records and the Recent hub row are stored separately and are not part of the JSON export.
- 🌱 The app starts completely empty. There is no demo data.

---

## 🚧 Limits

- 🔔 **Reminders** fire only while the app is open or running in the background. True push reminders when the app is closed need a server.
- 🏷️ The **app badge** needs an installed app on a browser that supports it.
- 🖱️ Dragging tasks between days works with a mouse. On touch screens use the **move** (⇄) button.
- 🗣️ The quick-add parser treats words like "sun" or "mon" as weekdays. Check the preview chips before adding.
- ↩️ Undoing a transfer restores a snapshot, so tasks added after the transfer are removed by that undo.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| 🕰️ Page looks old after an update | Raise `CACHE_NAME` in `sw.js`, hard refresh (`Ctrl + Shift + R`), close and reopen the app |
| 🎨 Panels look unstyled | Check that `css/nexus-ui.css` exists and is linked in `index.html` |
| 🐞 Red errors in the console | Press `F12`, open Console, and check which file the error names |
| 📲 Download card missing | Use Chrome on Android, open the hosted https link, wait a few seconds. It is hidden once installed |
| 🚫 Missing file on the live site | Open the file's URL directly. A 404 means it did not upload |

---

## 🧱 Tech

Plain HTML, CSS and JavaScript. No framework, no build step, no external API calls. Charts are inline SVG. Offline support comes from a service worker that caches every file listed in `sw.js`.

---

🛸 Built with curiosity. Keep shipping! 🚀

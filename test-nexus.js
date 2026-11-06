/**
 * NEXUS - Automated Verification & Test Suite
 * Location: tools/test-nexus.js
 * Run from the project root:  node tools/test-nexus.js
 *
 * Tests: empty initial state, dates, task sorting, recurring per-date tracking,
 * transfer (3 modes + undo), Hub and Palette registries, banned-word scan,
 * relative paths, calendar grid, and cleanup checks (voice, install banner, iOS sheet).
 */

const fs = require('fs');
const path = require('path');

// Project root = one folder above /tools
const ROOT = __dirname;
const p = (...parts) => path.join(ROOT, ...parts);

// -------------------------------------------------------------
// Browser-like environment for the modules
// -------------------------------------------------------------
global.window = global;
global.localStorage = (function () {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Load modules in order
require(p('js', 'config.js'));
require(p('js', 'audio.js'));
require(p('js', 'dates.js'));
require(p('js', 'storage.js'));
require(p('js', 'state.js'));
require(p('js', 'recurring.js'));
require(p('js', 'tasks.js'));
require(p('js', 'transfer.js'));
require(p('js', 'charts.js'));
require(p('js', 'hub.js'));
require(p('js', 'palette.js'));

const Dates = window.NexusApp.Dates;
const State = window.NexusApp.State;
const Recurring = window.NexusApp.Recurring;
const Tasks = window.NexusApp.Tasks;
const Transfer = window.NexusApp.Transfer;
const Hub = window.NexusApp.Hub;
const Palette = window.NexusApp.Palette;

console.log('=== RUNNING NEXUS AUTOMATED VERIFICATION SUITE ===\n');

let failedTests = 0;
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    failedTests++;
  } else {
    console.log('✓ PASS:', message);
  }
}

// -------------------------------------------------------------
// TEST 1: Initial Empty State (Zero Seed Data)
// -------------------------------------------------------------
const initialData = State.getData();
assert(Array.isArray(initialData.tasks) && initialData.tasks.length === 0, 'Initial tasks array is COMPLETELY EMPTY (0 tasks)');
assert(Array.isArray(initialData.recurring) && initialData.recurring.length === 0, 'Initial recurring array is COMPLETELY EMPTY (0 templates)');
assert(Array.isArray(initialData.lists) && initialData.lists.length === 0, 'Initial lists array is COMPLETELY EMPTY (0 lists)');

// -------------------------------------------------------------
// TEST 2: Local Date Handling (Zero UTC Skew)
// -------------------------------------------------------------
const todayStr = Dates.getTodayStr();
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `Today formatted as YYYY-MM-DD: ${todayStr}`);

const yesterday = Dates.addDays(todayStr, -1);
const tomorrow = Dates.addDays(todayStr, 1);
assert(Dates.daysBetween(yesterday, todayStr) === 1, '1 day between yesterday and today');
assert(Dates.isPast(yesterday) === true, 'Yesterday correctly identified as past');
assert(Dates.isFuture(tomorrow) === true, 'Tomorrow correctly identified as future');

// -------------------------------------------------------------
// TEST 3: Daily Stats When Empty
// -------------------------------------------------------------
const emptyStats = Tasks.getDailyStats(todayStr);
assert(emptyStats.total === 0, 'Empty stats total is 0');
assert(emptyStats.done === 0, 'Empty stats done is 0');
assert(emptyStats.percent === 0, 'Empty stats percent is 0%');

// -------------------------------------------------------------
// TEST 4: Task Addition, Prioritization & Sorting
// -------------------------------------------------------------
const testDate = '2026-11-20';
Tasks.addTask({ title: 'Task Low No Time', date: testDate, priority: 'low' });
Tasks.addTask({ title: 'Task High Late', date: testDate, time: '18:00', priority: 'high' });
Tasks.addTask({ title: 'Task Critical Early', date: testDate, time: '08:00', priority: 'critical' });
Tasks.addTask({ title: 'Task Completed Early', date: testDate, time: '06:00', priority: 'critical', done: true });

const sorted = Tasks.getTasksForDate(testDate);
assert(sorted.length === 4, '4 tasks returned for test date');
assert(sorted[0].title === 'Task Critical Early', `08:00 Critical task is first: got "${sorted[0].title}"`);
assert(sorted[1].title === 'Task High Late', `18:00 High task is second: got "${sorted[1].title}"`);
assert(sorted[2].title === 'Task Low No Time', `No-time Low task is third: got "${sorted[2].title}"`);
assert(sorted[3].title === 'Task Completed Early' && sorted[3].done === true, 'Completed task sank to the very bottom');

// -------------------------------------------------------------
// TEST 5: Recurring Tasks & Per-Date Completion
// -------------------------------------------------------------
const tpl = Recurring.createTemplate({
  title: 'Daily System Diagnostics',
  repeat: { type: 'daily' },
  startDate: '2026-11-01',
  priority: 'high'
});
assert(Boolean(tpl && tpl.id), 'Recurring template created');

const monDate = '2026-11-09';
const tueDate = '2026-11-10';

const monInst = Recurring.getInstancesForDate(monDate);
const tueInst = Recurring.getInstancesForDate(tueDate);
assert(monInst.length === 1 && tueInst.length === 1, 'Recurring instance generated dynamically for Monday & Tuesday');

Recurring.toggleInstanceCompletion(tpl.id, monDate);
const monAfter = Recurring.getInstancesForDate(monDate);
const tueAfter = Recurring.getInstancesForDate(tueDate);

assert(monAfter[0].done === true, 'Monday recurring instance marked DONE');
assert(tueAfter[0].done === false, 'Tuesday recurring instance remains PENDING (zero cross-day leakage)');

// -------------------------------------------------------------
// TEST 6: Transfer (All 3 Modes + Undo)
// -------------------------------------------------------------
const pastDate = yesterday;
Tasks.addTask({ title: 'Unfinished Past Mission', date: pastDate, priority: 'high' });

const modeA = Transfer.getEligibleTasks('specific', pastDate);
assert(modeA.length === 1, 'Mode A (specific date) returned 1 unfinished task');

const modeB = Transfer.getEligibleTasks('lastWeek');
assert(modeB.length >= 1, 'Mode B (last 7 days) returned pending tasks');

const modeC = Transfer.getEligibleTasks('allPast');
assert(modeC.length >= 1, 'Mode C (all past) returned pending tasks');

const targetFuture = Dates.addDays(todayStr, 4);
const moveResult = Transfer.executeTransfer({
  taskIds: [modeA[0].id],
  targetDate: targetFuture,
  actionType: 'move'
});
assert(moveResult.success === true, `Move executed: ${moveResult.message}`);
assert(modeA[0].date === targetFuture, 'Task date updated to future target date');
assert(modeA[0].carriedFrom === pastDate, 'Task marked with carriedFrom tag');

Tasks.undoLastAction();
assert(State.getData().tasks.find(t => t.id === modeA[0].id).date === pastDate, 'Undo restored task to original past date');

// -------------------------------------------------------------
// TEST 7: Command Hub nodes
// (count is flexible: the Hub changes as features are added/removed)
// -------------------------------------------------------------
assert(Array.isArray(Hub.HUB_NODES) && Hub.HUB_NODES.length >= 10, `Command Hub has its node registry (got ${Hub.HUB_NODES.length} nodes)`);
assert(Hub.HUB_NODES.every(n => n && n.id && n.label), 'Every Hub node has an id and a label');

// -------------------------------------------------------------
// TEST 8: Command Palette commands
// -------------------------------------------------------------
assert(Array.isArray(Palette.COMMANDS) && Palette.COMMANDS.length >= 15, `Command Palette has an extensive registry (${Palette.COMMANDS.length} commands)`);

// -------------------------------------------------------------
// TEST 9: Banned Word Verification
// Terms are built from char codes so the literal words are not in the codebase.
// -------------------------------------------------------------
const bannedWords = [
  String.fromCharCode(106, 97, 114, 118, 105, 115),
  String.fromCharCode(116, 111, 110, 121, 32, 115, 116, 97, 114, 107)
];
let foundBanned = false;

function scanDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== '.git' && f !== 'node_modules') scanDir(full);
    } else if (/\.(html|js|css|json|md)$/i.test(f)) {
      const content = fs.readFileSync(full, 'utf-8').toLowerCase();
      for (const bw of bannedWords) {
        if (content.includes(bw)) {
          console.error(`❌ BANNED WORD "${bw}" found in ${full}`);
          foundBanned = true;
        }
      }
    }
  }
}

scanDir(ROOT);
assert(!foundBanned, 'Zero occurrences of banned words anywhere in the repository');

// -------------------------------------------------------------
// TEST 10: Strict Relative Paths (no leading '/')
// -------------------------------------------------------------
const indexHtml = fs.readFileSync(p('index.html'), 'utf-8');
const manifestJson = fs.readFileSync(p('manifest.json'), 'utf-8');
const swContent = fs.readFileSync(p('sw.js'), 'utf-8');

const badHrefSrc = indexHtml.match(/(?:href|src)=["']\/[a-zA-Z0-9]/g) || [];
assert(badHrefSrc.length === 0, 'All href/src in index.html are purely relative (no leading /)');

const badManifestPaths = manifestJson.match(/["']\/[a-zA-Z0-9]/g) || [];
assert(badManifestPaths.length === 0, 'All paths in manifest.json are purely relative');

const badSwPaths = swContent.match(/['"]\/[a-zA-Z0-9]/g) || [];
assert(badSwPaths.length === 0, 'All paths in sw.js are purely relative');

// -------------------------------------------------------------
// TEST 11: Calendar Alignment & 7-Column Grid
// -------------------------------------------------------------
// November 2026: Nov 1 is a Sunday
const novSunGrid = Dates.getMonthGrid(2026, 10, 'sun');
assert(novSunGrid.grid[0].dateStr === '2026-11-01', 'Sun-start grid: Nov 1, 2026 is cell 0');
assert(novSunGrid.grid.length % 7 === 0, `Sun-start grid is a multiple of 7 (got ${novSunGrid.grid.length})`);

const novMonGrid = Dates.getMonthGrid(2026, 10, 'mon');
assert(novMonGrid.grid[0].dateStr === '2026-10-26', 'Mon-start grid: Oct 26 is cell 0');
assert(novMonGrid.grid[6].dateStr === '2026-11-01', 'Mon-start grid: Nov 1, 2026 is cell 6 (Sunday column)');
assert(novMonGrid.grid.length % 7 === 0, `Mon-start grid is a multiple of 7 (got ${novMonGrid.grid.length})`);

const compCss = fs.readFileSync(p('css', 'components.css'), 'utf-8');
assert(compCss.includes('grid-template-columns: repeat(7, 1fr)'), 'CSS contains the 7-column grid repeat(7, 1fr)');
assert(compCss.includes('.cal-weekdays-row'), 'CSS defines .cal-weekdays-row');
assert(compCss.includes('.cal-days-grid'), 'CSS defines .cal-days-grid');
assert(compCss.includes('.cal-dot-low') && compCss.includes('.cal-dot-critical'), 'CSS defines priority dot colors');
assert(compCss.includes('.all-done-glow'), 'CSS defines the all-done glow');

// -------------------------------------------------------------
// TEST 12: Cleanup Verification (voice, install banner, iOS sheet)
// -------------------------------------------------------------
assert(!/voice|speech|recognition/i.test(indexHtml), 'index.html has no voice/speech code');
assert(!indexHtml.includes('nexus-voice-mic-btn'), 'index.html has no mic button');
assert(!indexHtml.includes('js/voice.js'), 'index.html does not load voice.js');
assert(!/voice\.js/.test(swContent), 'sw.js does not precache voice.js');
assert(!fs.existsSync(p('js', 'voice.js')), 'js/voice.js is deleted');
assert(!indexHtml.includes('pwa-install-banner'), 'Install banner removed from index.html');
assert(!indexHtml.includes('ios-install-sheet'), 'iOS install sheet removed from index.html');

// No leftover voice references in any JS file (reports the exact file)
let voiceLeftovers = [];
for (const f of fs.readdirSync(p('js'))) {
  if (!f.endsWith('.js')) continue;
  const src = fs.readFileSync(p('js', f), 'utf-8');
  if (/voice|speechrecognition|webkitspeechrecognition/i.test(src)) voiceLeftovers.push(f);
}
assert(voiceLeftovers.length === 0, voiceLeftovers.length === 0
  ? 'No JS file references voice or speech recognition'
  : `Voice references still found in: ${voiceLeftovers.join(', ')}`);

// -------------------------------------------------------------
// TEST 13: Project structure (root should stay tidy)
// -------------------------------------------------------------
assert(!fs.existsSync(p('generate-icons.js')), 'generate-icons.js is moved out of the root (into tools/)');
assert(!fs.existsSync(p('test-nexus.js')), 'test-nexus.js is moved out of the root (into tools/)');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n==============================================');
if (failedTests === 0) {
  console.log('🎉 ALL TESTS PASSED! NEXUS SYSTEM IS FULLY OPERATIONAL.');
} else {
  console.error(`❌ ${failedTests} TEST(S) FAILED!`);
  process.exit(1);
}
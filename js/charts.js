/**
 * NEXUS - Holographic SVG Visualisation & Telemetry Engine
 * Pure inline SVG. Zero external dependencies.
 * Features: Centerpiece Donut Chart, 7-Day Velocity Bars, 30-Day Matrix, real Best Streak
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Charts = (function() {
  const Dates = window.NexusApp.Dates;

  function renderHolographicDonut(containerId, percent, done, total) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const clampedPercent = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
    const offset = circumference - (clampedPercent / 100) * circumference;

    let statusLabel = 'STANDBY';
    let progressColor = '#22d3ee';
    let glowColor = 'rgba(34, 211, 238, 0.4)';

    if (total === 0) {
      statusLabel = 'NO DIRECTIVES';
      progressColor = 'rgba(34, 211, 238, 0.25)';
    } else if (clampedPercent === 100) {
      statusLabel = 'ALL COMPLETE';
      progressColor = '#10b981';
      glowColor = 'rgba(16, 185, 129, 0.45)';
    } else if (clampedPercent >= 50) {
      statusLabel = 'IN PROGRESS';
      progressColor = '#22d3ee';
    } else {
      statusLabel = 'UNDERWAY';
      progressColor = '#f59e0b';
      glowColor = 'rgba(245, 158, 11, 0.4)';
    }

    const svgHtml = `
      <div class="holo-donut-wrapper ${total === 0 ? 'is-empty' : ''}">
        <svg viewBox="0 0 220 220" class="holo-donut-svg" aria-label="Completion: ${clampedPercent}%">
          <defs>
            <filter id="holoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="cyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
          </defs>

          <!-- Outer rotating holographic ring -->
          <circle cx="110" cy="110" r="100" class="holo-ring-outer" />

          <!-- Mid counter-rotating orbital ring -->
          <circle cx="110" cy="110" r="90" class="holo-ring-mid" />

          <!-- Background gauge track -->
          <circle cx="110" cy="110" r="${radius}" class="holo-track" />

          <!-- Tick marks (visible only when there are no tasks) -->
          <circle cx="110" cy="110" r="${radius}" class="holo-ticks" />

          <!-- Active progress gauge -->
          <circle cx="110" cy="110" r="${radius}" class="holo-progress"
                  style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${progressColor}; filter: drop-shadow(0 0 10px ${glowColor});" />

          <!-- Inner decorative nodes -->
          <circle cx="110" cy="110" r="54" class="holo-ring-inner" />

          <!-- Central Metrics Text -->
          <text x="110" y="102" text-anchor="middle" class="holo-pct-text">${clampedPercent}%</text>
          <text x="110" y="122" text-anchor="middle" class="holo-count-text">${done} OF ${total} COMPLETE</text>
          <text x="110" y="138" text-anchor="middle" class="holo-status-text">${statusLabel}</text>
        </svg>
      </div>
    `;

    container.innerHTML = svgHtml;
  }

  function renderWeeklyVelocityBars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const today = Dates.getTodayStr();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = Dates.addDays(today, -i);
      const stats = window.NexusApp.Tasks.getDailyStats(dStr);
      days.push({
        dateStr: dStr,
        dayShort: Dates.getDayName(dStr, false),
        dateShort: dStr.substring(8, 10),
        stats: stats
      });
    }

    const svgWidth = 360;
    const svgHeight = 150;
    const barWidth = 32;
    const gap = (svgWidth - (7 * barWidth)) / 8;
    const maxBarHeight = 85;
    const baseY = 115;

    let barsSvg = '';
    days.forEach((d, idx) => {
      const x = gap + idx * (barWidth + gap);
      const barHeight = Math.max(4, (d.stats.percent / 100) * maxBarHeight);
      const y = baseY - barHeight;
      const isToday = d.dateStr === today;
      const barColor = isToday ? 'url(#cyanVioletGrad)' : (d.stats.percent === 100 ? '#10b981' : 'rgba(34, 211, 238, 0.45)');

      barsSvg += `
        <g class="bar-group" tabindex="0" role="graphics-symbol" aria-label="${d.dayShort} ${d.dateShort}: ${d.stats.percent}%">
          <rect x="${x}" y="${baseY - maxBarHeight}" width="${barWidth}" height="${maxBarHeight}" rx="6" class="bar-slot" />
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${barColor}" class="bar-fill">
            <animate attributeName="height" from="0" to="${barHeight}" dur="0.4s" fill="freeze" />
            <animate attributeName="y" from="${baseY}" to="${y}" dur="0.4s" fill="freeze" />
          </rect>
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" class="bar-pct-label">${d.stats.percent}%</text>
          <text x="${x + barWidth / 2}" y="${baseY + 16}" text-anchor="middle" class="bar-x-label ${isToday ? 'active' : ''}">${d.dayShort}</text>
          <text x="${x + barWidth / 2}" y="${baseY + 28}" text-anchor="middle" class="bar-x-sub">${d.dateShort}</text>
        </g>
      `;
    });

    const svgHtml = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="nexus-chart-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22d3ee" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
        </defs>
        <line x1="10" y1="${baseY - maxBarHeight}" x2="${svgWidth - 10}" y2="${baseY - maxBarHeight}" class="chart-gridline" />
        <line x1="10" y1="${baseY - maxBarHeight / 2}" x2="${svgWidth - 10}" y2="${baseY - maxBarHeight / 2}" class="chart-gridline" />
        <line x1="10" y1="${baseY}" x2="${svgWidth - 10}" y2="${baseY}" class="chart-baseline" />
        ${barsSvg}
      </svg>
    `;

    container.innerHTML = svgHtml;
  }

  // 30-day matrix: a calendar-style grid (one square per day) with weekday headings,
  // a colour key, and tap-for-details.
  function renderHeatmap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const today = Dates.getTodayStr();
    const weekStart = (window.NexusApp.State.getSettings().weekStart) || 'mon';
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const dStr = Dates.addDays(today, -i);
      cells.push({ dateStr: dStr, stats: window.NexusApp.Tasks.getDailyStats(dStr) });
    }

    // Pad the first row so every date sits under its weekday heading
    const firstDow = Dates.strToDate(cells[0].dateStr).getDay();
    const lead = weekStart === 'mon' ? (firstDow + 6) % 7 : firstDow;

    const headers = weekStart === 'mon'
      ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    let fullDays = 0;
    let activeDays = 0;

    let cellsHtml = '';
    for (let b = 0; b < lead; b++) cellsHtml += '<div class="heatmap-cell heatmap-blank"></div>';

    cells.forEach((c, idx) => {
      let level = 0;
      if (c.stats.total > 0) {
        activeDays++;
        if (c.stats.percent === 100) { level = 4; fullDays++; }
        else if (c.stats.percent >= 66) level = 3;
        else if (c.stats.percent >= 33) level = 2;
        else level = 1;
      }
      const dayNum = parseInt(c.dateStr.substring(8, 10), 10);
      const isFirst = dayNum === 1 || idx === 0;
      const monthLabel = MONTHS[parseInt(c.dateStr.substring(5, 7), 10) - 1];

      cellsHtml += `
        <button type="button" class="heatmap-cell level-${level} ${c.dateStr === today ? 'is-today' : ''} ${isFirst ? 'is-first' : ''}"
                data-date="${c.dateStr}" data-month="${monthLabel}"
                aria-label="${c.dateStr}: ${c.stats.done} of ${c.stats.total} done">
          ${dayNum}
        </button>`;
    });

    container.innerHTML = `
      <div class="heatmap-container">
        <p class="heatmap-caption">Each square is one day (last 30 days). The colour shows how many of that day's tasks you finished.</p>
        <div class="heatmap-weekdays">${headers.map(h => `<span class="heatmap-weekday">${h}</span>`).join('')}</div>
        <div class="heatmap-grid">${cellsHtml}</div>
        <div class="heatmap-detail" id="heatmap-detail">Tap a square to see that day.</div>
        <div class="heatmap-summary">${fullDays} fully completed day${fullDays === 1 ? '' : 's'} · ${activeDays} day${activeDays === 1 ? '' : 's'} with tasks</div>
        <div class="heatmap-legend">
          <span class="legend-item"><i class="legend-swatch level-0"></i>No tasks</span>
          <span class="legend-item"><i class="legend-swatch level-1"></i>Under 33%</span>
          <span class="legend-item"><i class="legend-swatch level-2"></i>33–65%</span>
          <span class="legend-item"><i class="legend-swatch level-3"></i>66–99%</span>
          <span class="legend-item"><i class="legend-swatch level-4"></i>100% done</span>
        </div>
      </div>
    `;

    const detail = container.querySelector('#heatmap-detail');
    container.querySelectorAll('button.heatmap-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.heatmap-cell.is-selected').forEach(x => x.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        const d = btn.getAttribute('data-date');
        const s = window.NexusApp.Tasks.getDailyStats(d);
        const label = `${Dates.getDayName(d, false)} ${Dates.formatDisplayDate(d, 'short')}`;
        detail.textContent = s.total === 0
          ? `${label}: no tasks`
          : `${label}: ${s.done} of ${s.total} done (${s.percent}%)`;
      });
    });
  }

  function calculateMetrics() {
    const today = Dates.getTodayStr();
    const stateData = window.NexusApp.State.getData();
    const tasks = stateData.tasks || [];

    // Current streak: consecutive fully completed days, today counts once finished
    let currentStreak = 0;
    let checkDate = Dates.addDays(today, -1);

    const todayStats = window.NexusApp.Tasks.getDailyStats(today);
    if (todayStats.total > 0 && todayStats.percent === 100) {
      currentStreak++;
    }

    for (let i = 0; i < 365; i++) {
      const stats = window.NexusApp.Tasks.getDailyStats(checkDate);
      if (stats.total > 0 && stats.percent === 100) {
        currentStreak++;
        checkDate = Dates.addDays(checkDate, -1);
      } else if (stats.total === 0) {
        checkDate = Dates.addDays(checkDate, -1);
      } else {
        break;
      }
    }

    // Best streak: scan every day from the earliest known date up to today
    let earliest = today;
    tasks.forEach(t => { if (t.date && t.date < earliest) earliest = t.date; });
    (stateData.recurring || []).forEach(r => { if (r.startDate && r.startDate < earliest) earliest = r.startDate; });
    const span = Math.min(Dates.daysBetween(earliest, today), 730);

    let run = 0;
    let bestStreak = 0;
    for (let i = span; i >= 0; i--) {
      const d = Dates.addDays(today, -i);
      const st = window.NexusApp.Tasks.getDailyStats(d);
      if (st.total === 0) continue;                       // empty days neither add nor break
      if (st.percent === 100) { run++; bestStreak = Math.max(bestStreak, run); }
      else if (d !== today) run = 0;                      // today is still in progress
    }
    bestStreak = Math.max(bestStreak, currentStreak);

    const allTotal = tasks.length;
    const allDone = tasks.filter(t => t.done).length;
    const overallRate = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayDone = [0, 0, 0, 0, 0, 0, 0];

    tasks.forEach(t => {
      const d = Dates.strToDate(t.date);
      const dow = d.getDay();
      dayTotals[dow]++;
      if (t.done) dayDone[dow]++;
    });

    let bestDow = 2; // Default Tuesday
    let bestDowRate = -1;
    for (let i = 0; i < 7; i++) {
      if (dayTotals[i] > 0) {
        const rate = dayDone[i] / dayTotals[i];
        if (rate > bestDowRate) {
          bestDowRate = rate;
          bestDow = i;
        }
      }
    }

    return {
      currentStreak,
      bestStreak,
      overallRate,
      mostProductiveDay: Dates.DAY_NAMES_FULL[bestDow],
      allTotal,
      allDone
    };
  }

  return {
    renderHolographicDonut,
    renderWeeklyVelocityBars,
    renderHeatmap,
    calculateMetrics
  };
})();

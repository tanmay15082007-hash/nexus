/**
 * NEXUS - Local Date Calculation Engine
 * Pure local time. Zero UTC skew. All dates normalized to "YYYY-MM-DD".
 */

window.NexusApp = window.NexusApp || {};

window.NexusApp.Dates = (function() {
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  function dateToStr(date) {
    const y = date.getFullYear();
    const m = padZero(date.getMonth() + 1);
    const d = padZero(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function strToDate(str) {
    if (!str || typeof str !== 'string') return new Date();
    const parts = str.split('-');
    if (parts.length !== 3) return new Date();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0); // Noon to prevent timezone / DST edge cases
  }

  function getTodayStr() {
    return dateToStr(new Date());
  }

  function addDays(dateStr, numDays) {
    const d = strToDate(dateStr);
    d.setDate(d.getDate() + numDays);
    return dateToStr(d);
  }

  function daysBetween(dateStr1, dateStr2) {
    const d1 = strToDate(dateStr1);
    const d2 = strToDate(dateStr2);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  function isToday(dateStr) {
    return dateStr === getTodayStr();
  }

  function isPast(dateStr) {
    return dateStr < getTodayStr();
  }

  function isFuture(dateStr) {
    return dateStr > getTodayStr();
  }

  function getDayName(dateStr, full = false) {
    const d = strToDate(dateStr);
    const idx = d.getDay();
    return full ? DAY_NAMES_FULL[idx] : DAY_NAMES_SHORT[idx];
  }

  function getMonthName(monthIdx, full = false) {
    return full ? MONTH_NAMES_FULL[monthIdx] : MONTH_NAMES_SHORT[monthIdx];
  }

  function formatDisplayDate(dateStr, format = 'short') {
    const d = strToDate(dateStr);
    const dayNum = padZero(d.getDate());
    const monthStr = MONTH_NAMES_SHORT[d.getMonth()].toUpperCase();
    const year = d.getFullYear();
    const dayName = DAY_NAMES_SHORT[d.getDay()].toUpperCase();

    if (format === 'full') {
      return `${DAY_NAMES_FULL[d.getDay()]}, ${dayNum} ${MONTH_NAMES_FULL[d.getMonth()]} ${year}`;
    }
    if (format === 'header') {
      return `${DAY_NAMES_FULL[d.getDay()]}, ${dayNum} ${MONTH_NAMES_SHORT[d.getMonth()]} ${year}`;
    }
    return `${dayNum} ${monthStr} ${year}`;
  }

  function formatTime(timeStr, format12or24 = '24') {
    if (!timeStr) return '';
    if (format12or24 === '24') return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  // Generate 7-day multi-day horizon for the Week Board timeline
  function getMultiDayWindow(startDateStr, count = 7) {
    const days = [];
    for (let i = 0; i < count; i++) {
      const dStr = addDays(startDateStr, i);
      const d = strToDate(dStr);
      days.push({
        dateStr: dStr,
        dayName: DAY_NAMES_SHORT[d.getDay()].toUpperCase(),
        dayFullName: DAY_NAMES_FULL[d.getDay()],
        dayNumber: padZero(d.getDate()),
        monthShort: MONTH_NAMES_SHORT[d.getMonth()].toUpperCase(),
        year: d.getFullYear(),
        isToday: isToday(dStr),
        isPast: isPast(dStr)
      });
    }
    return days;
  }

  // Month grid for calendar modal
  function getMonthGrid(year, month, weekStart = 'mon') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon...
    if (weekStart === 'mon') {
      startDayOfWeek = (startDayOfWeek + 6) % 7;
    }

    const grid = [];

    // Leading days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dStr = dateToStr(prevDate);
      grid.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: isToday(dStr),
        isPast: isPast(dStr)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dStr = dateToStr(curDate);
      grid.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isToday(dStr),
        isPast: isPast(dStr)
      });
    }

    // Trailing days
    const totalCells = grid.length > 35 ? 42 : 35;
    const remaining = totalCells - grid.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dStr = dateToStr(nextDate);
      grid.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: isToday(dStr),
        isPast: isPast(dStr)
      });
    }

    return {
      year,
      month,
      monthName: MONTH_NAMES_FULL[month],
      grid
    };
  }

  return {
    dateToStr,
    strToDate,
    getTodayStr,
    addDays,
    daysBetween,
    isToday,
    isPast,
    isFuture,
    getDayName,
    getMonthName,
    formatDisplayDate,
    formatTime,
    getMultiDayWindow,
    getMonthGrid,
    MONTH_NAMES_SHORT,
    MONTH_NAMES_FULL,
    DAY_NAMES_SHORT,
    DAY_NAMES_FULL
  };
})();

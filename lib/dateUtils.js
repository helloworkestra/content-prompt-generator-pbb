// Parse an ISO date string 'YYYY-MM-DD' as a LOCAL date (avoids UTC shift).
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function diffDays(a, b) {
  // whole-day diff, ignoring DST time components
  const ms = 24 * 60 * 60 * 1000;
  const au = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bu = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((au - bu) / ms);
}

export function dayNumberForDate(date, startDate) {
  if (!startDate) return null;
  return diffDays(date, startDate) + 1;
}

export function dateForDayNumber(dayNumber, startDate) {
  if (!startDate) return null;
  return addDays(startDate, dayNumber - 1);
}

export function monthGrid(year, month /* 0-based */) {
  // Sunday-start grid of Date objects covering the month.
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const gridStart = addDays(first, -startWeekday);
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
  return cells;
}

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

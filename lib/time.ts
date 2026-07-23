/** Utilities for working with "minutes from midnight" bedtime values. */

export const MINUTES_IN_DAY = 1440;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Format minutes-from-midnight as a friendly 12h label, e.g. 1170 -> "7:30 PM". */
export function formatTime(minutes: number): string {
  const m = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

export function minutesFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Build a Date today (or on `base`) at the given minutes-from-midnight. */
export function dateAtMinutes(minutes: number, base = new Date()): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/** Local YYYY-MM-DD key for a date. */
export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** 5 = Friday, 6 = Saturday (JS getDay convention). */
export function isWeekendNight(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6;
}

export function weekdayLabel(date: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Friendly date label, e.g. "Wed 15 Jul". */
export function formatDate(date: Date): string {
  return `${weekdayLabel(date)} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Parse a YYYY-MM-DD key into a local Date (midnight). */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

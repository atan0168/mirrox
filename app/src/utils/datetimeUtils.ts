import { format, addDays, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export function toMillis(d: Date | number): number {
  return d instanceof Date ? d.getTime() : d;
}

export function nowMillis(): number {
  return Date.now();
}

export function lastNightWindow(now: Date): { start: Date; end: Date } {
  const tz = getDeviceTimeZone();
  const zonedNow = toZonedTime(now, tz);
  const todayStr = format(zonedNow, 'yyyy-MM-dd');
  const end = fromZonedTime(`${todayStr}T12:00:00`, tz);
  const prevZoned = addDays(zonedNow, -1);
  const prevStr = format(prevZoned, 'yyyy-MM-dd');
  const start = fromZonedTime(`${prevStr}T18:00:00`, tz);
  return { start, end };
}

export function getDeviceTimeZone(): string {
  try {
    // Intl API is supported on modern RN/Hermes; fallback to UTC if unavailable
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Format a date as YYYY-MM-DD in the given timezone
export function yyyymmddInTimeZone(d: Date, timeZone: string): string {
  const zoned = toZonedTime(d, timeZone);
  return format(zoned, 'yyyy-MM-dd');
}

// Compute the start of day for a given date in the specified timezone.
// Uses a robust Intl-based approach so the instant corresponds to 00:00:00 in that TZ.
export function startOfDayInTimeZone(d: Date, timeZone: string): Date {
  // Get the calendar date in the target TZ
  const dateStr = yyyymmddInTimeZone(d, timeZone);
  // Convert that local midnight to a UTC instant
  return fromZonedTime(`${dateStr}T00:00:00`, timeZone);
}

// === Local-day helpers ===
// Local-day label for display: e.g., 'yyyy-MM-dd' according to user's timezone
export function localDayString(date: Date = new Date()): string {
  const tz = getDeviceTimeZone();
  return yyyymmddInTimeZone(date, tz);
}

// Canonical DB key: UTC calendar date string of the start of local day
export function localDayKeyUtc(date: Date = new Date()): string {
  const tz = getDeviceTimeZone();
  const start = startOfDayInTimeZone(date, tz);
  return start.toISOString().split('T')[0];
}

export function yesterdayLocalDayString(date: Date = new Date()): string {
  return localDayString(addDays(date, -1));
}

export function yesterdayLocalDayKeyUtc(date: Date = new Date()): string {
  return localDayKeyUtc(addDays(date, -1));
}

export function isSameLocalDay(a: Date | number, b: Date | number): boolean {
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  return localDayString(d1) === localDayString(d2);
}

export function startOfLocalDay(date: Date = new Date()): Date {
  const tz = getDeviceTimeZone();
  return startOfDayInTimeZone(date, tz);
}

export function endOfLocalDay(date: Date = new Date()): Date {
  const tz = getDeviceTimeZone();
  const s = yyyymmddInTimeZone(date, tz);
  return fromZonedTime(`${s}T23:59:59.999`, tz);
}

export function minutesSinceLocalMidnight(iso: string): number {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

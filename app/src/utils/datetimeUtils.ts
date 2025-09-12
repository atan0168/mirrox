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

export function minutesSinceLocalMidnight(iso: string): number {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

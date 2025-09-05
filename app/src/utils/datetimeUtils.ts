export function toMillis(d: Date | number): number {
  return d instanceof Date ? d.getTime() : d;
}

export function nowMillis(): number {
  return Date.now();
}

export function lastNightWindow(now: Date): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { start, end };
}

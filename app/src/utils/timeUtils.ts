export function toMillis(d: Date | number): number {
  return d instanceof Date ? d.getTime() : d;
}

export function nowMillis(): number {
  return Date.now();
}

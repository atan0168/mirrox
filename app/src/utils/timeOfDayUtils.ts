import { GlobalTimeOfDay } from '../store/avatarStore';

// Phase boundaries (inclusive start, exclusive end) in 24h hours
// morning: 06-10, day: 11-16, evening:17-20, night: 21-05 (wrap)
// Adjust by changing PHASE_WINDOWS in one place.
export interface PhaseWindow {
  phase: GlobalTimeOfDay;
  startHour: number; // inclusive
  endHour: number; // exclusive (mod 24)
}

export const PHASE_WINDOWS: PhaseWindow[] = [
  { phase: 'morning', startHour: 6, endHour: 11 },
  { phase: 'day', startHour: 11, endHour: 17 },
  { phase: 'evening', startHour: 17, endHour: 21 },
  // night wraps across midnight: 21 -> 24 and 0 -> 6
  { phase: 'night', startHour: 21, endHour: 24 },
  { phase: 'night', startHour: 0, endHour: 6 },
];

export function getPhaseForDate(date: Date): GlobalTimeOfDay {
  const h = date.getHours();
  for (const w of PHASE_WINDOWS) {
    if (w.startHour <= w.endHour) {
      if (h >= w.startHour && h < w.endHour) return w.phase;
    } else {
      // wrap window
      if (h >= w.startHour || h < w.endHour) return w.phase;
    }
  }
  return 'day'; // fallback (should not hit)
}

export function getNextBoundaryTimestamp(from: Date): number {
  const h = from.getHours();
  const m = from.getMinutes();
  const s = from.getSeconds();
  const ms = from.getMilliseconds();
  // Search upcoming boundaries in next 24h
  const nowMs = from.getTime();
  let best: number | null = null;
  const boundaries: Array<{ hour: number; phase: GlobalTimeOfDay }> = [
    { hour: 6, phase: 'morning' },
    { hour: 11, phase: 'day' },
    { hour: 17, phase: 'evening' },
    { hour: 21, phase: 'night' },
  ];
  for (let i = 0; i < boundaries.length; i++) {
    let target = new Date(from);
    target.setHours(boundaries[i].hour, 0, 0, 0);
    if (target.getTime() <= nowMs) {
      target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    }
    if (best == null || target.getTime() < best) best = target.getTime();
  }
  // Fallback to one hour later if somehow null
  if (best == null) {
    const fallback = new Date(from);
    fallback.setHours(h + 1, 0, 0, 0);
    best = fallback.getTime();
  }
  return best;
}

export function msUntilNextBoundary(now: Date = new Date()): number {
  const nextTs = getNextBoundaryTimestamp(now);
  return Math.max(50, nextTs - now.getTime());
}

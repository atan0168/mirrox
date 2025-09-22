import type { HealthHistory, HealthSnapshot } from '../models/Health';

export type HRVStressLevel = 'none' | 'mild' | 'moderate' | 'high';

export interface HRVStressResult {
  stressLevel: HRVStressLevel;
  intensity: number; // 0..1
  hrvMs: number | null;
  baselineHrvMs: number | null;
  restingHeartRateBpm: number | null;
  baselineRestingHeartRateBpm: number | null;
  reasons: string[];
}

function median(values: number[]): number | null {
  const arr = values
    .filter(v => typeof v === 'number' && !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

export function computeBaselineHRV(
  history: HealthHistory | null,
  days: number = 14
) {
  const snapshots = history?.snapshots ?? [];
  if (!snapshots.length) return { hrv: null, rhr: null } as const;
  const recent = snapshots.slice(-days);
  const hrvs = recent.map(s => s.hrvMs).filter((v): v is number => v != null);
  const rhrs = recent
    .map(s => s.restingHeartRateBpm)
    .filter((v): v is number => v != null);
  return { hrv: median(hrvs), rhr: median(rhrs) } as const;
}

export function computeStressFromHealth(
  latest: HealthSnapshot | null,
  history: HealthHistory | null
): HRVStressResult {
  const reasons: string[] = [];
  if (!latest) {
    return {
      stressLevel: 'none',
      intensity: 0,
      hrvMs: null,
      baselineHrvMs: null,
      restingHeartRateBpm: null,
      baselineRestingHeartRateBpm: null,
      reasons: ['No health snapshot available'],
    };
  }

  const { hrv: baselineHRV, rhr: baselineRHR } = computeBaselineHRV(history);
  const todayHRV = latest.hrvMs ?? null;
  const todayRHR = latest.restingHeartRateBpm ?? null;

  // Fallback thresholds if baseline missing or insufficient
  let level: HRVStressLevel = 'none';
  let intensity = 0;

  if (todayHRV == null) {
    reasons.push('HRV not available');
    return {
      stressLevel: 'none',
      intensity: 0,
      hrvMs: null,
      baselineHrvMs: baselineHRV ?? null,
      restingHeartRateBpm: todayRHR,
      baselineRestingHeartRateBpm: baselineRHR ?? null,
      reasons,
    };
  }

  if (!baselineHRV || baselineHRV <= 0) {
    // Generic thresholds until baseline is established
    if (todayHRV < 40) {
      level = 'high';
      intensity = 0.9;
    } else if (todayHRV < 60) {
      level = 'moderate';
      intensity = 0.6;
    } else if (todayHRV < 80) {
      level = 'mild';
      intensity = 0.3;
    } else {
      level = 'none';
      intensity = 0.0;
    }
    reasons.push('Baseline HRV not established — using generic thresholds');
  } else {
    const delta = (baselineHRV - todayHRV) / baselineHRV; // positive when HRV is below baseline
    if (delta < 0.1) {
      level = 'none';
      intensity = 0.0;
    } else if (delta < 0.25) {
      level = 'mild';
      intensity = 0.35;
    } else if (delta < 0.4) {
      level = 'moderate';
      intensity = 0.6;
    } else {
      level = 'high';
      intensity = 0.9;
    }
    reasons.push(`HRV change vs baseline: ${(delta * 100).toFixed(0)}% lower`);
  }

  // Modulators
  const sleepMin = latest.sleepMinutes ?? null;
  if (sleepMin != null && sleepMin > 0) {
    if (sleepMin < 360) {
      // <6h
      // bump one level
      const mapUp: Record<HRVStressLevel, HRVStressLevel> = {
        none: 'mild',
        mild: 'moderate',
        moderate: 'high',
        high: 'high',
      };
      level = mapUp[level];
      intensity = Math.min(1, intensity + 0.15);
      reasons.push('Short sleep last night (<6h)');
    } else if (sleepMin > 480) {
      // >8h
      const mapDown: Record<HRVStressLevel, HRVStressLevel> = {
        high: 'moderate',
        moderate: 'mild',
        mild: 'none',
        none: 'none',
      };
      level = mapDown[level];
      intensity = Math.max(0, intensity - 0.1);
      reasons.push('Good sleep duration (>8h)');
    }
  }

  if (todayRHR != null && baselineRHR != null && baselineRHR > 0) {
    const rhrDelta = (todayRHR - baselineRHR) / baselineRHR;
    if (rhrDelta >= 0.1) {
      const mapUp: Record<HRVStressLevel, HRVStressLevel> = {
        none: 'mild',
        mild: 'moderate',
        moderate: 'high',
        high: 'high',
      };
      level = mapUp[level];
      intensity = Math.min(1, intensity + 0.1);
      reasons.push(`Elevated resting HR (+${Math.round(rhrDelta * 100)}%)`);
    } else if (rhrDelta <= -0.1) {
      const mapDown: Record<HRVStressLevel, HRVStressLevel> = {
        high: 'moderate',
        moderate: 'mild',
        mild: 'none',
        none: 'none',
      };
      level = mapDown[level];
      intensity = Math.max(0, intensity - 0.1);
      reasons.push(`Lower resting HR (${Math.round(rhrDelta * 100)}%)`);
    }
  }

  const mindful = latest.mindfulMinutes ?? null;
  if (mindful != null && mindful >= 15) {
    const mapDown: Record<HRVStressLevel, HRVStressLevel> = {
      high: 'moderate',
      moderate: 'mild',
      mild: 'none',
      none: 'none',
    };
    level = mapDown[level];
    intensity = Math.max(0, intensity - 0.05);
    reasons.push('Mindful minutes ≥ 15');
  }

  return {
    stressLevel: level,
    intensity,
    hrvMs: todayHRV,
    baselineHrvMs: baselineHRV ?? null,
    restingHeartRateBpm: todayRHR,
    baselineRestingHeartRateBpm: baselineRHR ?? null,
    reasons,
  };
}

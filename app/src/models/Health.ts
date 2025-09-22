export type HealthPlatform = 'ios' | 'android' | 'mock' | 'unknown';

export type HealthPermissionStatus = 'granted' | 'denied' | 'unknown';

export interface StepSample {
  start: string; // ISO
  end: string; // ISO
  value: number; // count
}

export type SleepStage =
  | 'asleep'
  | 'awake'
  | 'inBed'
  | 'light'
  | 'deep'
  | 'rem'
  | 'unknown';

export interface SleepSegment {
  start: string; // ISO
  end: string; // ISO
  stage: SleepStage;
}

export interface SleepSession {
  start: string; // ISO
  end: string; // ISO
  durationMinutes: number;
  segments?: SleepSegment[];
}

export interface HealthSnapshot {
  date: string; // YYYY-MM-DD (local)
  timestamp: string; // ISO when recorded
  platform: HealthPlatform;
  steps: number; // total steps for date
  sleepMinutes: number; // last-night sleep minutes
  // Sync state
  finalized?: boolean | null; // true if day is fully synced (past day window)
  // Sleep details (nullable fields; best-effort based on platform data)
  sleepStart?: string | null; // ISO bedtime (last night)
  sleepEnd?: string | null; // ISO wake time (this morning)
  timeInBedMinutes?: number | null; // Sum of in-bed duration
  awakeningsCount?: number | null; // Number of awake segments during session
  // Sleep stage breakdown (minutes)
  sleepLightMinutes?: number | null;
  sleepDeepMinutes?: number | null;
  sleepRemMinutes?: number | null;
  // Additional wellness metrics (nullable if unavailable)
  hrvMs?: number | null; // Heart Rate Variability (ms)
  restingHeartRateBpm?: number | null; // Resting Heart Rate (bpm)
  activeEnergyKcal?: number | null; // Active energy burned (kcal)
  mindfulMinutes?: number | null; // Total minutes of mindful sessions today
  respiratoryRateBrpm?: number | null; // Respiratory rate (breaths/min)
  workoutsCount?: number | null; // Number of workouts today
}

export interface HealthHistory {
  snapshots: HealthSnapshot[];
}

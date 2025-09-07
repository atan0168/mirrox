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

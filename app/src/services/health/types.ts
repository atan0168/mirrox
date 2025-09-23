import type { HealthPermissionStatus } from '../../models/Health';

export interface SleepDetails {
  sleepStart?: string | null;
  sleepEnd?: string | null;
  asleepMinutes: number; // equals sleepMinutes currently used
  timeInBedMinutes?: number | null;
  awakeningsCount?: number | null;
  sleepLightMinutes?: number | null;
  sleepDeepMinutes?: number | null;
  sleepRemMinutes?: number | null;
}

export interface ExerciseSessionData {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  activityType: string;
  metValue?: number | null;
  source?: string | null;
  title?: string | null;
}

export interface HealthProvider {
  getPlatform(): 'ios' | 'android' | 'mock' | 'unknown';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<HealthPermissionStatus>;
  getDailySteps(start: Date, end: Date): Promise<number>;
  // Generic sleep minutes query for any window
  getSleepMinutes(start: Date, end: Date): Promise<number>;
  getLastNightSleepMinutes(reference?: Date): Promise<number>;
  // Detailed sleep session metrics for a window / last night
  getSleepDetails(start: Date, end: Date): Promise<SleepDetails | null>;
  getLastNightSleepDetails(reference?: Date): Promise<SleepDetails | null>;
  // Additional metrics for the current day window [start, end]
  getDailyHRVMs(start: Date, end: Date): Promise<number | null>;
  getDailyRestingHeartRateBpm(start: Date, end: Date): Promise<number | null>;
  getDailyActiveEnergyKcal(start: Date, end: Date): Promise<number | null>;
  getDailyMindfulMinutes(start: Date, end: Date): Promise<number | null>;
  getDailyRespiratoryRateBrpm(start: Date, end: Date): Promise<number | null>;
  getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null>;
  getExerciseSessions?(start: Date, end: Date): Promise<ExerciseSessionData[]>;
}

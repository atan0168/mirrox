import type { HealthPermissionStatus } from '../../models/Health';

export interface HealthProvider {
  getPlatform(): 'ios' | 'android' | 'mock' | 'unknown';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<HealthPermissionStatus>;
  getDailySteps(start: Date, end: Date): Promise<number>;
  // Generic sleep minutes query for any window
  getSleepMinutes(start: Date, end: Date): Promise<number>;
  getLastNightSleepMinutes(reference?: Date): Promise<number>;
  // Additional metrics for the current day window [start, end]
  getDailyHRVMs(start: Date, end: Date): Promise<number | null>;
  getDailyRestingHeartRateBpm(start: Date, end: Date): Promise<number | null>;
  getDailyActiveEnergyKcal(start: Date, end: Date): Promise<number | null>;
  getDailyMindfulMinutes(start: Date, end: Date): Promise<number | null>;
  getDailyRespiratoryRateBrpm(start: Date, end: Date): Promise<number | null>;
  getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null>;
}

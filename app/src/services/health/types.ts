import type { HealthPermissionStatus } from '../../models/Health';

export interface HealthProvider {
  getPlatform(): 'ios' | 'android' | 'mock' | 'unknown';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<HealthPermissionStatus>;
  getDailySteps(start: Date, end: Date): Promise<number>;
  getLastNightSleepMinutes(reference?: Date): Promise<number>;
}

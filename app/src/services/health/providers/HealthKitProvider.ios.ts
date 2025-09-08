import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider } from '../types';
import * as HealthKit from '@kingstinct/react-native-healthkit';
import { lastNightWindow } from '../../../utils/datetimeUtils';

// Use identifiers expected by @kingstinct/react-native-healthkit
const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount' as const,
  'HKCategoryTypeIdentifierSleepAnalysis' as const,
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' as const,
  'HKQuantityTypeIdentifierRestingHeartRate' as const,
  'HKQuantityTypeIdentifierActiveEnergyBurned' as const,
  'HKCategoryTypeIdentifierMindfulSession' as const,
  'HKQuantityTypeIdentifierRespiratoryRate' as const,
  // Workouts are handled via workout queries and do not require explicit read type here,
  // but some HealthKit versions need HKWorkoutType authorization implicitly.
];

export class HealthKitProvider implements HealthProvider {
  getPlatform() {
    return 'ios' as const;
  }

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return Promise.resolve(false);
    return HealthKit.isHealthDataAvailableAsync();
  }

  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (!(await this.isAvailable())) return 'denied';
    try {
      // Signature mirrors HealthKit: requestAuthorization(typesToShare, typesToRead)
      // We only need READ access for Steps and Sleep Analysis.
      const granted = await HealthKit.requestAuthorization([], READ_TYPES);
      return granted ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  async getDailySteps(start: Date, end: Date): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      // Use queryQuantitySamples for step count
      const samples = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          ascending: false,
          filter: {
            startDate: start,
            endDate: end,
          },
          unit: 'count',
        }
      );
      const total = (samples || []).reduce((sum: number, s) => {
        const value = s?.quantity;
        return sum + value;
      }, 0);
      return Math.max(0, Math.round(total));
    } catch {}
    return 0;
  }

  async getLastNightSleepMinutes(
    reference: Date = new Date()
  ): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    const { start, end } = lastNightWindow(reference);
    try {
      // Use queryCategorySamples for sleep data
      const res = await HealthKit.queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        {
          filter: {
            startDate: start,
            endDate: end,
          },
        }
      );
      const minutes = (res || [])
        .filter(s => {
          const v = s?.value;
          return v !== 2; // exclude 'awake' (commonly 2)
        })
        .reduce((sum: number, s) => {
          const startTime = s?.startDate;
          const endTime = s?.endDate;
          if (!startTime || !endTime) return sum;
          const sMs = new Date(startTime).getTime();
          const eMs = new Date(endTime).getTime();
          return sum + Math.max(0, eMs - sMs) / 60000;
        }, 0);
      return Math.round(minutes);
    } catch {}
    return 0;
  }

  async getDailyHRVMs(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const samples = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        {
          ascending: false,
          filter: { startDate: start, endDate: end },
          unit: 'ms',
        }
      );
      if (!samples?.length) return null;
      const avg =
        samples.reduce((s: number, x: any) => s + (x?.quantity || 0), 0) /
        samples.length;
      return Math.round(avg * 10) / 10;
    } catch {}
    return null;
  }

  async getDailyRestingHeartRateBpm(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const samples = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierRestingHeartRate',
        {
          ascending: false,
          filter: { startDate: start, endDate: end },
          unit: 'count/min',
        }
      );
      if (!samples?.length) return null;
      const avg =
        samples.reduce((s: number, x: any) => s + (x?.quantity || 0), 0) /
        samples.length;
      return Math.round(avg);
    } catch {}
    return null;
  }

  async getDailyActiveEnergyKcal(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const samples = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        {
          ascending: false,
          filter: { startDate: start, endDate: end },
          unit: 'kcal',
        }
      );
      if (!samples?.length) return 0;
      const total = samples.reduce(
        (s: number, x: any) => s + (x?.quantity || 0),
        0
      );
      return Math.round(total);
    } catch {}
    return null;
  }

  async getDailyMindfulMinutes(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const res = await HealthKit.queryCategorySamples(
        'HKCategoryTypeIdentifierMindfulSession',
        { filter: { startDate: start, endDate: end } }
      );
      if (!res?.length) return 0;
      const minutes = res.reduce((sum: number, s: any) => {
        const st = s?.startDate ? new Date(s.startDate).getTime() : 0;
        const et = s?.endDate ? new Date(s.endDate).getTime() : 0;
        return sum + Math.max(0, et - st) / 60000;
      }, 0);
      return Math.round(minutes);
    } catch {}
    return null;
  }

  async getDailyRespiratoryRateBrpm(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const samples = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierRespiratoryRate',
        {
          ascending: false,
          filter: { startDate: start, endDate: end },
          unit: 'count/min',
        }
      );
      if (!samples?.length) return null;
      const avg =
        samples.reduce((s: number, x: any) => s + (x?.quantity || 0), 0) /
        samples.length;
      return Math.round(avg * 10) / 10;
    } catch {}
    return null;
  }

  async getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      // Some versions of the library expose a dedicated workouts query
      const maybeQueryWorkouts: any = (HealthKit as any).queryWorkouts;
      if (typeof maybeQueryWorkouts === 'function') {
        const workouts = await maybeQueryWorkouts({
          filter: { startDate: start, endDate: end },
        });
        return (workouts || []).length;
      }
      // Fallback: try to query as samples if supported by the library version
      const maybeQueryCategorySamples: any = (HealthKit as any)
        .queryCategorySamples;
      if (typeof maybeQueryCategorySamples === 'function') {
        const workouts = await maybeQueryCategorySamples('HKWorkoutType', {
          filter: { startDate: start, endDate: end },
        });
        return (workouts || []).length;
      }
    } catch {}
    return null;
  }
}

export default new HealthKitProvider();

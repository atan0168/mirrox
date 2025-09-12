import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider, SleepDetails } from '../types';
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
          // Ensure we fetch the full day's samples. Some bridges default to a
          // relatively small limit which can undercount on active days.
          // 0 typically means "no limit" in native bridges
          limit: 0,
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
    return this.getSleepMinutes(start, end);
  }

  async getSleepMinutes(start: Date, end: Date): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      // Use queryCategorySamples for sleep data
      const res = await HealthKit.queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        {
          filter: { startDate: start, endDate: end },
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

  async getLastNightSleepDetails(
    reference: Date = new Date()
  ): Promise<SleepDetails | null> {
    if (!(await this.isAvailable())) return null;
    const { start, end } = lastNightWindow(reference);
    return this.getSleepDetails(start, end);
  }

  async getSleepDetails(start: Date, end: Date): Promise<SleepDetails | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const samples = await HealthKit.queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        { filter: { startDate: start, endDate: end } }
      );
      if (!samples || !samples.length) {
        return {
          asleepMinutes: 0,
          sleepStart: null,
          sleepEnd: null,
          timeInBedMinutes: null,
          awakeningsCount: 0,
          sleepLightMinutes: null,
          sleepDeepMinutes: null,
          sleepRemMinutes: null,
        };
      }

      let minStart: number | null = null;
      let maxEnd: number | null = null;
      let asleepMinutes = 0;
      let timeInBedMinutes = 0;
      let light = 0;
      let deep = 0;
      let rem = 0;
      let awakenings = 0;

      for (const s of samples) {
        const st = s?.startDate ? new Date(s.startDate).getTime() : null;
        const et = s?.endDate ? new Date(s.endDate).getTime() : null;
        if (st == null || et == null) continue;
        const durMin = Math.max(0, et - st) / 60000;
        if (minStart == null || st < minStart) minStart = st;
        if (maxEnd == null || et > maxEnd) maxEnd = et;

        const v = s.value;
        // HealthKit HKCategoryValueSleepAnalysis mapping (likely):
        // 0 = InBed, 1 = Asleep (unspecified), 2 = Awake, 3 = Asleep Core/Light, 4 = Asleep Deep, 5 = Asleep REM
        if (v === 0) {
          timeInBedMinutes += durMin;
        } else if (v === 2) {
          awakenings += 1; // count each awake segment
        } else if (v === 4) {
          deep += durMin;
          asleepMinutes += durMin;
        } else if (v === 5) {
          rem += durMin;
          asleepMinutes += durMin;
        } else if (v === 3) {
          light += durMin;
          asleepMinutes += durMin;
        } else if (v === 1) {
          // asleep unspecified
          asleepMinutes += durMin;
        } else {
          // Unknown category; ignore
        }
      }

      const details: SleepDetails = {
        asleepMinutes: Math.round(asleepMinutes),
        sleepStart: minStart ? new Date(minStart).toISOString() : null,
        sleepEnd: maxEnd ? new Date(maxEnd).toISOString() : null,
        timeInBedMinutes: Math.round(timeInBedMinutes) || null,
        awakeningsCount: awakenings,
        sleepLightMinutes: light ? Math.round(light) : null,
        sleepDeepMinutes: deep ? Math.round(deep) : null,
        sleepRemMinutes: rem ? Math.round(rem) : null,
      };
      return details;
    } catch (e) {}
    return null;
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
        samples.reduce((s: number, x) => s + (x?.quantity || 0), 0) /
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
        samples.reduce((s: number, x) => s + (x?.quantity || 0), 0) /
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
      const total = samples.reduce((s: number, x) => s + (x?.quantity || 0), 0);
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
      const minutes = res.reduce((sum: number, s) => {
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
        samples.reduce((s: number, x) => s + (x?.quantity || 0), 0) /
        samples.length;
      return Math.round(avg * 10) / 10;
    } catch {}
    return null;
  }

  async getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      // Query workouts using queryWorkoutSamples
      const workouts = await HealthKit.queryWorkoutSamples({
        filter: { startDate: start, endDate: end },
      });
      return (workouts || []).length;
    } catch {}
    return null;
  }
}

export default new HealthKitProvider();

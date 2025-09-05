import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider } from '../types';
import * as HealthKit from '@kingstinct/react-native-healthkit';
import { lastNightWindow } from '../../../utils/datetimeUtils';

// Use identifiers expected by @kingstinct/react-native-healthkit
const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount' as const,
  'HKCategoryTypeIdentifierSleepAnalysis' as const,
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
}

export default new HealthKitProvider();

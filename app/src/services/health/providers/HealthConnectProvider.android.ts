import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider } from '../types';
import * as HealthConnect from '@zensein/react-native-health-connect';
import { lastNightWindow } from '../../../utils/datetimeUtils';

function toIso(d: Date) {
  return d.toISOString();
}

export class HealthConnectProvider implements HealthProvider {
  getPlatform() {
    return 'android' as const;
  }

  async isAvailable(): Promise<boolean> {
    return (
      Platform.OS === 'android' &&
      (await HealthConnect.getSdkStatus()) ==
        HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE
    );
  }

  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (!(await this.isAvailable())) return 'denied';
    try {
      const { initialize, requestPermission, getGrantedPermissions } =
        HealthConnect;

      console.log('[HealthConnect] initialize');
      await initialize();
      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'Mindfulness' },
        { accessType: 'read', recordType: 'RespiratoryRate' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ] as HealthConnect.Permission[];

      console.log('[HealthConnect] requestPermission');
      await requestPermission(permissions);
      const granted = await getGrantedPermissions();
      const ok = granted?.some(p => p.recordType === 'Steps');
      return ok ? 'granted' : 'denied';
    } catch (e) {
      return 'denied';
    }
  }

  async getDailySteps(start: Date, end: Date): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      const { initialize, readRecords } = HealthConnect;
      // Ensure SDK is initialized before reading
      try {
        await initialize();
      } catch {}
      const res = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const total = (res?.records || []).reduce(
        (sum: number, r) => sum + (r.count || 0),
        0
      );
      return total;
    } catch (e) {
      // Surface as zero but log for debugging
      console.warn('[HealthConnect] getDailySteps failed', e);
      return 0;
    }
  }

  async getLastNightSleepMinutes(
    reference: Date = new Date()
  ): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      const { initialize, readRecords } = HealthConnect;
      // Ensure SDK is initialized before reading
      try {
        await initialize();
      } catch {}
      const { start, end } = lastNightWindow(reference);
      const res = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const minutes = (res?.records || []).reduce((sum: number, r) => {
        const s = new Date(r.startTime).getTime();
        const e = new Date(r.endTime).getTime();
        return sum + Math.max(0, e - s) / 60000;
      }, 0);
      return Math.round(minutes);
    } catch (e) {
      console.warn('[HealthConnect] getLastNightSleepMinutes failed', e);
      return 0;
    }
  }

  async getDailyHRVMs(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) return null;
      const avg =
        records.reduce(
          (s: number, r) => s + (r.heartRateVariabilityMillis || 0),
          0
        ) / records.length;
      return Math.round(avg * 10) / 10;
    } catch (e) {
      console.warn('[HealthConnect] getDailyHRVMs failed', e);
      return null;
    }
  }

  async getDailyRestingHeartRateBpm(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('RestingHeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) return null;
      const avg =
        records.reduce((s: number, r) => s + (r.beatsPerMinute || 0), 0) /
        records.length;
      return Math.round(avg);
    } catch (e) {
      console.warn('[HealthConnect] getDailyRestingHeartRateBpm failed', e);
      return null;
    }
  }

  async getDailyActiveEnergyKcal(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) return 0;
      const total = records.reduce(
        (s: number, r) => s + (r.energy?.inKilocalories || 0),
        0
      );
      return Math.round(total);
    } catch (e) {
      console.warn('[HealthConnect] getDailyActiveEnergyKcal failed', e);
      return null;
    }
  }

  async getDailyMindfulMinutes(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('MindfulnessSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) return 0;
      const minutes = records.reduce((sum: number, r) => {
        const s = new Date(r.startTime).getTime();
        const e = new Date(r.endTime).getTime();
        return sum + Math.max(0, e - s) / 60000;
      }, 0);
      return Math.round(minutes);
    } catch (e) {
      console.warn('[HealthConnect] getDailyMindfulMinutes failed', e);
      return null;
    }
  }

  async getDailyRespiratoryRateBrpm(
    start: Date,
    end: Date
  ): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('RespiratoryRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) return null;
      const avg =
        records.reduce((s: number, r) => s + (r.rate || 0), 0) / records.length;
      return Math.round(avg * 10) / 10;
    } catch (e) {
      console.warn('[HealthConnect] getDailyRespiratoryRateBrpm failed', e);
      return null;
    }
  }

  async getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      return (res?.records || []).length;
    } catch (e) {
      console.warn('[HealthConnect] getDailyWorkoutsCount failed', e);
      return null;
    }
  }
}

export default new HealthConnectProvider();

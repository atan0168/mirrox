import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider, SleepDetails } from '../types';
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
        { accessType: 'read', recordType: 'RespiratoryRate' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ] as HealthConnect.Permission[];

      console.log('[HealthConnect] requestPermission');
      await requestPermission(permissions);
      const granted = await getGrantedPermissions();
      const ok = granted?.some(p => p.recordType === 'Steps');
      return ok ? 'granted' : 'denied';
    } catch (e) {
      console.log('[HealthConnect] requestPermissions failed', e);
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
    const { start, end } = lastNightWindow(reference);
    return this.getSleepMinutes(start, end);
  }

  async getSleepMinutes(start: Date, end: Date): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
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
      console.warn('[HealthConnect] getSleepMinutes failed', e);
      return 0;
    }
  }

  async getLastNightSleepDetails(
    reference: Date = new Date()
  ): Promise<SleepDetails | null> {
    if (!(await this.isAvailable())) return null;
    const { start, end } = lastNightWindow(reference);
    return this.getSleepDetails(start, end);
  }

  async getSleepDetails(
    start: Date,
    end: Date
  ): Promise<SleepDetails | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const { initialize, readRecords } = HealthConnect;
      try {
        await initialize();
      } catch {}
      const res = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: toIso(start),
          endTime: toIso(end),
        },
      });
      const records = res?.records || [];
      if (!records.length) {
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

      for (const r of records as any[]) {
        const st = r?.startTime ? new Date(r.startTime).getTime() : null;
        const et = r?.endTime ? new Date(r.endTime).getTime() : null;
        if (st != null && (minStart == null || st < minStart)) minStart = st;
        if (et != null && (maxEnd == null || et > maxEnd)) maxEnd = et;
        if (st != null && et != null) {
          timeInBedMinutes += Math.max(0, et - st) / 60000; // session span as time in bed
        }

        const stages = (r as any)?.stages || (r as any)?.stage ? [r.stage] : [];
        // stages is expected as array of { stage, startTime, endTime }
        for (const s of stages as any[]) {
          const ss = s?.startTime ? new Date(s.startTime).getTime() : null;
          const se = s?.endTime ? new Date(s.endTime).getTime() : null;
          if (ss == null || se == null) continue;
          const durMin = Math.max(0, se - ss) / 60000;
          const stage = (s?.stage || s?.stageType || '').toString().toLowerCase();
          if (stage.includes('awake')) {
            awakenings += 1;
          } else if (stage.includes('deep')) {
            deep += durMin;
            asleepMinutes += durMin;
          } else if (stage.includes('rem')) {
            rem += durMin;
            asleepMinutes += durMin;
          } else if (stage.includes('light') || stage.includes('core')) {
            light += durMin;
            asleepMinutes += durMin;
          } else {
            // Unknown/other stages; treat as asleep if marked asleep
            // Some APIs may mark 'asleep' generically
            if (stage.includes('asleep')) {
              asleepMinutes += durMin;
            }
          }
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
    } catch (e) {
      console.warn('[HealthConnect] getSleepDetails failed', e);
      return null;
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
    // Not supported until Api level 36 (Android 16)
    return null;
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

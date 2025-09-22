import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type {
  ExerciseSessionData,
  HealthProvider,
  SleepDetails,
} from '../types';
import * as HealthConnect from '@zensein/react-native-health-connect';
import { lastNightWindow } from '../../../utils/datetimeUtils';

function toIso(d: Date) {
  return d.toISOString();
}

type ExerciseMapping = {
  activityType: string;
  met: number;
};

const DEFAULT_EXERCISE_MAPPING: ExerciseMapping = {
  activityType: 'default',
  met: 6,
};

const EXERCISE_TYPE_MAPPING: Record<number, ExerciseMapping> = {
  [HealthConnect.ExerciseType.WALKING]: { activityType: 'walking', met: 3.5 },
  [HealthConnect.ExerciseType.RUNNING]: { activityType: 'running', met: 9.8 },
  [HealthConnect.ExerciseType.RUNNING_TREADMILL]: {
    activityType: 'running',
    met: 8.5,
  },
  [HealthConnect.ExerciseType.BIKING]: { activityType: 'cycling', met: 8 },
  [HealthConnect.ExerciseType.BIKING_STATIONARY]: {
    activityType: 'cycling',
    met: 7,
  },
  [HealthConnect.ExerciseType.HIKING]: { activityType: 'walking', met: 6 },
  [HealthConnect.ExerciseType.SWIMMING_POOL]: {
    activityType: 'swimming',
    met: 6.5,
  },
  [HealthConnect.ExerciseType.SWIMMING_OPEN_WATER]: {
    activityType: 'swimming',
    met: 7,
  },
  [HealthConnect.ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING]: {
    activityType: 'running',
    met: 10,
  },
  [HealthConnect.ExerciseType.STRENGTH_TRAINING]: {
    activityType: 'weightlifting',
    met: 6,
  },
  [HealthConnect.ExerciseType.WEIGHTLIFTING]: {
    activityType: 'weightlifting',
    met: 5.5,
  },
  [HealthConnect.ExerciseType.YOGA]: { activityType: 'yoga', met: 3 },
  [HealthConnect.ExerciseType.PILATES]: { activityType: 'yoga', met: 3.5 },
  [HealthConnect.ExerciseType.ELLIPTICAL]: { activityType: 'cycling', met: 6 },
  [HealthConnect.ExerciseType.ROWING]: { activityType: 'cycling', met: 7 },
  [HealthConnect.ExerciseType.ROWING_MACHINE]: {
    activityType: 'cycling',
    met: 7,
  },
  [HealthConnect.ExerciseType.BASKETBALL]: {
    activityType: 'basketball',
    met: 8,
  },
  [HealthConnect.ExerciseType.SOCCER]: { activityType: 'soccer', met: 10 },
  [HealthConnect.ExerciseType.TENNIS]: { activityType: 'tennis', met: 7 },
  [HealthConnect.ExerciseType.BADMINTON]: { activityType: 'tennis', met: 4.5 },
  [HealthConnect.ExerciseType.VOLLEYBALL]: { activityType: 'tennis', met: 4 },
  [HealthConnect.ExerciseType.BOXING]: { activityType: 'running', met: 9 },
  [HealthConnect.ExerciseType.MARTIAL_ARTS]: {
    activityType: 'running',
    met: 10,
  },
  [HealthConnect.ExerciseType.DANCING]: { activityType: 'default', met: 5.5 },
  [HealthConnect.ExerciseType.PADDLING]: { activityType: 'cycling', met: 5.5 },
  [HealthConnect.ExerciseType.SKATING]: { activityType: 'running', met: 7 },
  [HealthConnect.ExerciseType.SKIING]: { activityType: 'running', met: 7 },
  [HealthConnect.ExerciseType.SNOWBOARDING]: {
    activityType: 'running',
    met: 6.8,
  },
  [HealthConnect.ExerciseType.ROCK_CLIMBING]: {
    activityType: 'running',
    met: 8.5,
  },
  [HealthConnect.ExerciseType.SURFING]: { activityType: 'swimming', met: 5.5 },
  [HealthConnect.ExerciseType.GYMNASTICS]: {
    activityType: 'default',
    met: 4.5,
  },
  [HealthConnect.ExerciseType.CALISTHENICS]: {
    activityType: 'weightlifting',
    met: 4.5,
  },
  [HealthConnect.ExerciseType.BURPEE]: { activityType: 'running', met: 8 },
  [HealthConnect.ExerciseType.BOOT_CAMP]: { activityType: 'running', met: 9 },
  [HealthConnect.ExerciseType.RUGBY]: { activityType: 'soccer', met: 9.5 },
  [HealthConnect.ExerciseType.FOOTBALL_AMERICAN]: {
    activityType: 'soccer',
    met: 8,
  },
  [HealthConnect.ExerciseType.FOOTBALL_AUSTRALIAN]: {
    activityType: 'soccer',
    met: 9,
  },
  [HealthConnect.ExerciseType.CRICKET]: { activityType: 'tennis', met: 5 },
  [HealthConnect.ExerciseType.GOLF]: { activityType: 'walking', met: 4.3 },
  [HealthConnect.ExerciseType.TABLE_TENNIS]: {
    activityType: 'tennis',
    met: 4,
  },
  [HealthConnect.ExerciseType.FRISBEE_DISC]: {
    activityType: 'walking',
    met: 4,
  },
  [HealthConnect.ExerciseType.HANDBALL]: { activityType: 'soccer', met: 10 },
  [HealthConnect.ExerciseType.WATER_POLO]: {
    activityType: 'swimming',
    met: 10,
  },
};

const EXERCISE_TYPE_NAME_MAP = new Map<number, string>(
  Object.entries(HealthConnect.ExerciseType || {}).map(([name, value]) => [
    value as number,
    name,
  ])
);

function getExerciseMapping(type: number): ExerciseMapping {
  return EXERCISE_TYPE_MAPPING[type] ?? DEFAULT_EXERCISE_MAPPING;
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

  async getSleepDetails(start: Date, end: Date): Promise<SleepDetails | null> {
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

      for (const r of records as Array<{
        startTime?: string;
        endTime?: string;
        stages?: Array<{
          stage?: string;
          stageType?: string;
          startTime?: string;
          endTime?: string;
        }>;
        stage?: {
          stage?: string;
          stageType?: string;
          startTime?: string;
          endTime?: string;
        };
      }>) {
        const st = r?.startTime ? new Date(r.startTime).getTime() : null;
        const et = r?.endTime ? new Date(r.endTime).getTime() : null;
        if (st != null && (minStart == null || st < minStart)) minStart = st;
        if (et != null && (maxEnd == null || et > maxEnd)) maxEnd = et;
        if (st != null && et != null) {
          timeInBedMinutes += Math.max(0, et - st) / 60000; // session span as time in bed
        }

        const stages = r?.stages || (r?.stage ? [r.stage] : []);
        // stages is expected as array of { stage, startTime, endTime }
        for (const s of stages as Array<{
          stage?: string;
          stageType?: string;
          startTime?: string;
          endTime?: string;
        }>) {
          const ss = s?.startTime ? new Date(s.startTime).getTime() : null;
          const se = s?.endTime ? new Date(s.endTime).getTime() : null;
          if (ss == null || se == null) continue;
          const durMin = Math.max(0, se - ss) / 60000;
          const stage = (s?.stage || s?.stageType || '')
            .toString()
            .toLowerCase();
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

  async getDailyMindfulMinutes(
    _start: Date,
    _end: Date
  ): Promise<number | null> {
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

  async getExerciseSessions(
    start: Date,
    end: Date
  ): Promise<ExerciseSessionData[]> {
    if (!(await this.isAvailable())) return [];
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

      const records = (res?.records || []) as Array<{
        startTime?: string;
        endTime?: string;
        exerciseType?: number;
        title?: string;
        metadata?: { id?: string; dataOrigin?: string };
      }>;

      return records
        .map(record => {
          const startTime = record.startTime || new Date(start).toISOString();
          const endTime = record.endTime || new Date(startTime).toISOString();
          const startMs = new Date(startTime).getTime();
          const endMs = new Date(endTime).getTime();
          const durationMinutes = Math.max(
            0,
            Math.round((endMs - startMs) / 60000)
          );
          const exerciseType = record.exerciseType ?? 0;
          const mapping = getExerciseMapping(exerciseType);
          const id =
            record.metadata?.id ||
            `${startTime}-${endTime}-${exerciseType}`.toLowerCase();
          const source = record.metadata?.dataOrigin ?? null;
          const rawType = EXERCISE_TYPE_NAME_MAP.get(exerciseType) ?? 'UNKNOWN';

          return {
            id,
            startTime,
            endTime,
            durationMinutes,
            activityType: mapping.activityType,
            metValue: mapping.met,
            source,
            title: record.title ?? rawType,
          } as ExerciseSessionData;
        })
        .filter(session => session.durationMinutes > 0);
    } catch (e) {
      console.warn('[HealthConnect] getExerciseSessions failed', e);
      return [];
    }
  }
}

export default new HealthConnectProvider();

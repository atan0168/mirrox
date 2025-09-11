import { Platform } from 'react-native';
import { addDays, isAfter } from 'date-fns';
import type {
  HealthHistory,
  HealthPlatform,
  HealthSnapshot,
} from '../models/Health';
import {
  getDeviceTimeZone,
  startOfDayInTimeZone,
  yyyymmddInTimeZone,
} from '../utils/datetimeUtils';
import { HealthHistoryRepository } from './db/HealthHistoryRepository';
import { healthProvider } from './health';

export class HealthDataService {
  async requestPermissions(): Promise<boolean> {
    const status = await healthProvider.requestPermissions();
    return status === 'granted';
  }

  async syncLatest(now: Date = new Date()): Promise<HealthSnapshot> {
    const platform: HealthPlatform =
      Platform.OS === 'ios'
        ? 'ios'
        : Platform.OS === 'android'
          ? 'android'
          : 'mock';

    const timeZone = getDeviceTimeZone();
    const dayStart = startOfDayInTimeZone(now, timeZone);
    const steps = await healthProvider.getDailySteps(dayStart, now);
    const sleepMinutes = await healthProvider.getLastNightSleepMinutes(now);
    // Additional wellness metrics (best-effort; may return null if unavailable)
    const [
      hrvMs,
      restingHeartRateBpm,
      activeEnergyKcal,
      mindfulMinutes,
      respiratoryRateBrpm,
      workoutsCount,
    ] = await Promise.all([
      healthProvider.getDailyHRVMs(dayStart, now),
      healthProvider.getDailyRestingHeartRateBpm(dayStart, now),
      healthProvider.getDailyActiveEnergyKcal(dayStart, now),
      healthProvider.getDailyMindfulMinutes(dayStart, now),
      healthProvider.getDailyRespiratoryRateBrpm(dayStart, now),
      healthProvider.getDailyWorkoutsCount(dayStart, now),
    ]);

    const snapshot: HealthSnapshot = {
      date: yyyymmddInTimeZone(now, timeZone),
      timestamp: new Date().toISOString(),
      platform,
      steps,
      sleepMinutes,
      hrvMs: hrvMs ?? null,
      restingHeartRateBpm: restingHeartRateBpm ?? null,
      activeEnergyKcal: activeEnergyKcal ?? null,
      mindfulMinutes: mindfulMinutes ?? null,
      respiratoryRateBrpm: respiratoryRateBrpm ?? null,
      workoutsCount: workoutsCount ?? null,
    };

    // Store latest
    await this.saveLatest(snapshot);
    // Append to history (dedupe by date)
    await this.appendHistory(snapshot);

    return snapshot;
  }

  /**
   * Sync snapshots for all missing days up to maxDays (including today).
   * - If no data exists, backfills up to maxDays worth of days ending today.
   * - If data exists but is stale, fills the gap day-by-day up to today.
   * Returns the latest (today's) snapshot when done.
   */
  async syncNeeded(maxDays: number = 30, now: Date = new Date()): Promise<HealthSnapshot> {
    const timeZone = getDeviceTimeZone();
    const todayStr = yyyymmddInTimeZone(now, timeZone);

    const latest = await this.getLatest();

    // Helper to sync a specific local-date string (YYYY-MM-DD)
    const syncForDate = async (dateStr: string): Promise<HealthSnapshot> => {
      // Determine window [start, end)
      const dayStart = startOfDayInTimeZone(new Date(`${dateStr}T00:00:00`), timeZone);
      const nextDay = addDays(dayStart, 1);
      const end = isAfter(nextDay, now) ? now : nextDay;

      const platform: HealthPlatform =
        Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'mock';

      const steps = await healthProvider.getDailySteps(dayStart, end);
      // Sleep: use a reference time within this date so lastNightWindow(date) resolves correctly
      const sleepReference = new Date(`${dateStr}T09:00:00`);
      const sleepMinutes = await healthProvider.getLastNightSleepMinutes(sleepReference);

      const [
        hrvMs,
        restingHeartRateBpm,
        activeEnergyKcal,
        mindfulMinutes,
        respiratoryRateBrpm,
        workoutsCount,
      ] = await Promise.all([
        healthProvider.getDailyHRVMs(dayStart, end),
        healthProvider.getDailyRestingHeartRateBpm(dayStart, end),
        healthProvider.getDailyActiveEnergyKcal(dayStart, end),
        healthProvider.getDailyMindfulMinutes(dayStart, end),
        healthProvider.getDailyRespiratoryRateBrpm(dayStart, end),
        healthProvider.getDailyWorkoutsCount(dayStart, end),
      ]);

      const snapshot: HealthSnapshot = {
        date: dateStr,
        timestamp: new Date().toISOString(),
        platform,
        steps,
        sleepMinutes,
        hrvMs: hrvMs ?? null,
        restingHeartRateBpm: restingHeartRateBpm ?? null,
        activeEnergyKcal: activeEnergyKcal ?? null,
        mindfulMinutes: mindfulMinutes ?? null,
        respiratoryRateBrpm: respiratoryRateBrpm ?? null,
        workoutsCount: workoutsCount ?? null,
      };

      await this.saveLatest(snapshot);
      await this.appendHistory(snapshot);
      return snapshot;
    };

    // Compute dates to sync (inclusive), in ascending order
    // Build the desired window: last maxDays ending today (inclusive)
    const desiredStart = addDays(now, -(maxDays - 1));
    const desiredStartStr = yyyymmddInTimeZone(desiredStart, timeZone);
    const desiredStartDay = startOfDayInTimeZone(
      new Date(`${desiredStartStr}T00:00:00`),
      timeZone
    );
    const windowDates: string[] = [];
    for (let d = desiredStartDay; !isAfter(d, now); d = addDays(d, 1)) {
      const ds = yyyymmddInTimeZone(d, timeZone);
      if (ds > todayStr) break;
      windowDates.push(ds);
    }

    // Determine which of the window dates are missing in DB
    const existing = await this.getHistory(maxDays + 5); // fetch recent dates
    const have = new Set((existing.snapshots || []).map(s => s.date));
    let datesToSync = windowDates.filter(ds => !have.has(ds));
    // Always include today for a fresh latest snapshot
    if (!datesToSync.includes(todayStr)) datesToSync.push(todayStr);

    if (datesToSync.length === 0) {
      // Nothing to do; ensure we return a current snapshot
      return await this.syncLatest(now);
    }

    let latestSnapshot: HealthSnapshot | null = null;
    for (const ds of datesToSync) {
      latestSnapshot = await syncForDate(ds);
    }
    return latestSnapshot ?? (await this.syncLatest(now));
  }

  private async saveLatest(snapshot: HealthSnapshot) {
    // Store in SQLCipher DB (upsert by date)
    await HealthHistoryRepository.upsert(snapshot);
  }

  async getLatest(): Promise<HealthSnapshot | null> {
    return await HealthHistoryRepository.getLatest();
  }

  private async appendHistory(snapshot: HealthSnapshot) {
    // Upsert into SQLite; trimming is handled when reading with a LIMIT
    await HealthHistoryRepository.upsert(snapshot);
  }

  async getHistory(limit = 30): Promise<HealthHistory> {
    return await HealthHistoryRepository.getHistory(limit);
  }
}

export const healthDataService = new HealthDataService();

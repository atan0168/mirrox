import { Platform } from 'react-native';
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

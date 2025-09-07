import { Platform } from 'react-native';
import type {
  HealthHistory,
  HealthSnapshot,
  HealthPlatform,
} from '../models/Health';
import { healthProvider } from './health';
import { HealthHistoryRepository } from './db/HealthHistoryRepository';

function yyyymmddLocal(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

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

    const dayStart = startOfDay(now);
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
      date: yyyymmddLocal(now),
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

  async getHistory(): Promise<HealthHistory> {
    return await HealthHistoryRepository.getHistory(30);
  }
}

export const healthDataService = new HealthDataService();

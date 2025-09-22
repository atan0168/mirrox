import type { HealthPermissionStatus } from '../../../models/Health';
import type {
  ExerciseSessionData,
  HealthProvider,
  SleepDetails,
} from '../types';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class MockHealthProvider implements HealthProvider {
  getPlatform() {
    return 'mock' as const;
  }
  async getSleepMinutes(start: Date, end: Date): Promise<number> {
    // Mock: small chance of a daytime nap; at night returns similar to last-night calc
    const seed = parseInt(
      `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
      10
    );
    const startHour = start.getHours();
    const endHour = end.getHours();
    const isDaytime = startHour >= 12 && endHour <= 22;
    if (isDaytime) {
      // 30% chance of a nap 10-40 minutes
      const r = seededRandom(seed + 99);
      const tookNap = r < 0.3;
      return tookNap ? Math.round(10 + seededRandom(seed + 3) * 30) : 0;
    }
    // Nighttime-ish window: return value similar to lastNightSleepMinutes
    return this.getLastNightSleepMinutes(end);
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async requestPermissions(): Promise<HealthPermissionStatus> {
    return 'granted';
  }
  async getDailySteps(start: Date, _end: Date): Promise<number> {
    // mock deterministic steps based on date
    const day = parseInt(
      `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
      10
    );
    return Math.round(4000 + seededRandom(day) * 6000);
  }
  async getLastNightSleepMinutes(
    reference: Date = new Date()
  ): Promise<number> {
    const day = parseInt(
      `${reference.getFullYear()}${reference.getMonth()}${reference.getDate()}`,
      10
    );
    return Math.round(360 + seededRandom(day + 42) * 180); // 6h to 9h
  }

  async getLastNightSleepDetails(
    reference: Date = new Date()
  ): Promise<SleepDetails | null> {
    // Derive a deterministic mock details set around 6-9h sleep
    const day = parseInt(
      `${reference.getFullYear()}${reference.getMonth()}${reference.getDate()}`,
      10
    );
    const total = 360 + seededRandom(day + 42) * 180; // minutes
    const deep = Math.round(total * (0.15 + seededRandom(day + 1) * 0.1));
    const rem = Math.round(total * (0.2 + seededRandom(day + 2) * 0.1));
    const light = Math.max(0, Math.round(total - deep - rem));
    const awakenings = Math.floor(seededRandom(day + 3) * 3); // 0-2
    // Bedtime around 22:00-00:30
    const bedtimeHour = 22 + Math.floor(seededRandom(day + 4) * 3); // 22-24
    const bedtimeMin = Math.floor(seededRandom(day + 5) * 60);
    const start = new Date(reference);
    start.setDate(reference.getDate() - 1);
    start.setHours(bedtimeHour % 24, bedtimeMin, 0, 0);
    const end = new Date(
      start.getTime() + total * 60000 + awakenings * 5 * 60000
    );
    return {
      asleepMinutes: Math.round(total),
      sleepStart: start.toISOString(),
      sleepEnd: end.toISOString(),
      timeInBedMinutes: Math.round(total + awakenings * 5),
      awakeningsCount: awakenings,
      sleepLightMinutes: light,
      sleepDeepMinutes: deep,
      sleepRemMinutes: rem,
    };
  }

  async getSleepDetails(_start: Date, end: Date): Promise<SleepDetails | null> {
    // Use last-night details if window covers night range; otherwise return a short nap with no stages
    const details = await this.getLastNightSleepDetails(end);
    return details;
  }

  async getDailyHRVMs(start: Date, _end: Date): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 7;
    return Math.round((50 + seededRandom(seed) * 50) * 10) / 10; // 50-100 ms
  }

  async getDailyRestingHeartRateBpm(
    start: Date,
    _end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 13;
    return Math.round(55 + seededRandom(seed) * 20); // 55-75 bpm
  }

  async getDailyActiveEnergyKcal(
    start: Date,
    _end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 23;
    return Math.round(200 + seededRandom(seed) * 600); // 200-800 kcal
  }

  async getDailyMindfulMinutes(
    start: Date,
    _end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 31;
    return Math.round(seededRandom(seed) * 30); // 0-30 min
  }

  async getDailyRespiratoryRateBrpm(
    start: Date,
    _end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 37;
    return Math.round((12 + seededRandom(seed) * 6) * 10) / 10; // 12-18 brpm
  }

  async getDailyWorkoutsCount(start: Date, _end: Date): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 41;
    return Math.floor(seededRandom(seed) * 2); // 0-1 workouts
  }

  async getExerciseSessions(
    _start: Date,
    _end: Date
  ): Promise<ExerciseSessionData[]> {
    return [];
  }
}

export default new MockHealthProvider();

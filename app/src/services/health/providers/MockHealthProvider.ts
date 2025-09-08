import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider } from '../types';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class MockHealthProvider implements HealthProvider {
  getPlatform() {
    return 'mock' as const;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async requestPermissions(): Promise<HealthPermissionStatus> {
    return 'granted';
  }
  async getDailySteps(start: Date, end: Date): Promise<number> {
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

  async getDailyHRVMs(start: Date, end: Date): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 7;
    return Math.round((50 + seededRandom(seed) * 50) * 10) / 10; // 50-100 ms
  }

  async getDailyRestingHeartRateBpm(
    start: Date,
    end: Date
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
    end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 23;
    return Math.round(200 + seededRandom(seed) * 600); // 200-800 kcal
  }

  async getDailyMindfulMinutes(start: Date, end: Date): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 31;
    return Math.round(seededRandom(seed) * 30); // 0-30 min
  }

  async getDailyRespiratoryRateBrpm(
    start: Date,
    end: Date
  ): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 37;
    return Math.round((12 + seededRandom(seed) * 6) * 10) / 10; // 12-18 brpm
  }

  async getDailyWorkoutsCount(start: Date, end: Date): Promise<number | null> {
    const seed =
      parseInt(
        `${start.getFullYear()}${start.getMonth()}${start.getDate()}`,
        10
      ) + 41;
    return Math.floor(seededRandom(seed) * 2); // 0-1 workouts
  }
}

export default new MockHealthProvider();

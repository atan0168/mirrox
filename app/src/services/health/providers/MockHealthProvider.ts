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
}

export default new MockHealthProvider();

import { Platform } from 'react-native';
import type { HealthPermissionStatus } from '../../../models/Health';
import type { HealthProvider } from '../types';
import * as HealthConnect from 'react-native-health-connect';
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

      await initialize();
      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
      ] as HealthConnect.Permission[];

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
      const { readRecords } = HealthConnect;
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
      return 0;
    }
  }

  async getLastNightSleepMinutes(
    reference: Date = new Date()
  ): Promise<number> {
    if (!(await this.isAvailable())) return 0;
    try {
      const { readRecords } = HealthConnect;
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
      return 0;
    }
  }
}

export default new HealthConnectProvider();

import type { AlertItem } from '../models/Alert';
import { AlertsRepository } from './db/AlertsRepository';
import { ALERT_RETENTION_DAYS } from '../constants';
import { emitAlertsChanged } from './AlertsEvents';

export const AlertsService = {
  async getAll(includeDismissed = false): Promise<AlertItem[]> {
    return await AlertsRepository.getAll(includeDismissed);
  },

  async add(alert: AlertItem): Promise<void> {
    await AlertsRepository.add(alert);
    try {
      await AlertsRepository.purgeOlderThan(ALERT_RETENTION_DAYS);
    } catch {}
    // Notify listeners that alerts have changed
    emitAlertsChanged();
  },

  async clear(): Promise<void> {
    await AlertsRepository.clear();
    emitAlertsChanged();
  },

  async getById(id: string): Promise<AlertItem | null> {
    return await AlertsRepository.getById(id);
  },

  async dismiss(id: string): Promise<void> {
    await AlertsRepository.dismiss(id);
    emitAlertsChanged();
  },
};

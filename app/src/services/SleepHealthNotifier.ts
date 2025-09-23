import { AlertsService } from './AlertsService';
import { healthDataService } from './HealthDataService';
import { localStorageService } from './LocalStorageService';
import { requestNotificationPermissions } from './notifications';
import { evaluateSleepHealthInsights } from './insights/SleepHealthInsights';
import { runNotificationRules } from './NotificationOrchestrator';
import type { AlertItem } from '../models/Alert';
import { truncate } from '../utils/notificationUtils';

function tierToSeverity(tier: 1 | 2 | 3): 'high' | 'medium' | 'low' {
  return tier === 1 ? 'high' : tier === 2 ? 'medium' : 'low';
}

function buildSampleAlert(): AlertItem {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'sleep_health',
    createdAt: new Date().toISOString(),
    title: 'Sample Sleep Insight (Debug)',
    shortBody: 'Preview a supportive sleep insight in your notifications.',
    longBody:
      'This is a preview of a sleep insight. Real insights use your recent sleep data and cite the source behind each recommendation.',
    severity: 'low',
    dismissed: false,
  };
}

export const SleepHealthNotifier = {
  async isEnabled(): Promise<boolean> {
    return await localStorageService.getSleepHealthNotificationsEnabled();
  },

  async setEnabled(value: boolean): Promise<void> {
    await localStorageService.updatePreferences({
      enableSleepHealthNotifications: value,
    });
  },

  async evaluateAndNotifyNow(): Promise<AlertItem | null> {
    const alerts = await runNotificationRules({
      allowedRules: ['sleep.health.daily'],
    });
    const alert = alerts.find(a => a.type === 'sleep_health') ?? null;
    return alert ?? null;
  },

  async sendSampleNow(): Promise<void> {
    try {
      const ok = await requestNotificationPermissions();
      if (!ok) return;

      await healthDataService.syncNeeded(30);
      const history = await healthDataService.getHistory(30);
      const candidates = evaluateSleepHealthInsights(history);

      const mod = await import('expo-notifications');

      if (candidates.length) {
        const chosen = candidates[0];
        const alert: AlertItem = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'sleep_health',
          createdAt: new Date().toISOString(),
          title: chosen.title,
          shortBody: truncate(chosen.body, 120),
          longBody: chosen.body,
          sourceName: chosen.source,
          sourceUrl: chosen.sourceUrl,
          tier: chosen.tier,
          dataNote: chosen.dataNote,
          severity: tierToSeverity(chosen.tier),
          dismissed: false,
        };
        await AlertsService.add(alert);
        await mod.scheduleNotificationAsync({
          content: {
            title: alert.title,
            body: alert.shortBody,
            data: { alertId: alert.id, type: alert.type, debug: true },
          },
          trigger: null,
        });
        return;
      }

      const sample = buildSampleAlert();
      await AlertsService.add(sample);
      await mod.scheduleNotificationAsync({
        content: {
          title: sample.title,
          body: sample.shortBody,
          data: { alertId: sample.id, type: sample.type, debug: true },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn(
        '[SleepHealthNotifier] Failed to send sample notification',
        error
      );
    }
  },
};

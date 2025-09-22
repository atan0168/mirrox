import { healthDataService } from './HealthDataService';
import { localStorageService } from './LocalStorageService';
import { requestNotificationPermissions } from './notifications';
import {
  evaluateSleepHealthInsights,
  InsightCandidate,
} from './insights/SleepHealthInsights';
import { differenceInCalendarDays } from 'date-fns';
import { AlertsService } from './AlertsService';
import type { AlertItem } from '../models/Alert';
import { truncate } from '../utils/notificationUtils';
import {
  SLEEP_NOTIF_LAST_KEY,
  SLEEP_NOTIF_MIN_DAYS_BETWEEN,
} from '../constants';

type LastSentInfo = {
  id: string;
  date: string; // YYYY-MM-DD
};

function tierToSeverity(tier: 1 | 2 | 3): 'high' | 'medium' | 'low' {
  return tier === 1 ? 'high' : tier === 2 ? 'medium' : 'low';
}

function buildAlertFromCandidate(c: InsightCandidate): AlertItem {
  const longBody = c.body; // Keep body clean; show source and notes separately in UI
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'sleep_health',
    createdAt: new Date().toISOString(),
    title: c.title,
    shortBody: truncate(c.body, 120),
    longBody,
    sourceName: c.source,
    sourceUrl: c.sourceUrl,
    tier: c.tier,
    dataNote: c.dataNote,
    severity: tierToSeverity(c.tier),
    dismissed: false,
  };
}

export const SleepHealthNotifier = {
  // Preference helpers
  async isEnabled(): Promise<boolean> {
    return await localStorageService.getSleepHealthNotificationsEnabled();
  },
  async setEnabled(value: boolean): Promise<void> {
    await localStorageService.updatePreferences({
      enableSleepHealthNotifications: value,
    });
  },

  async getLastSent(): Promise<LastSentInfo | null> {
    const json = await localStorageService.getString(SLEEP_NOTIF_LAST_KEY);
    if (!json) return null;
    try {
      return JSON.parse(json) as LastSentInfo;
    } catch {
      return null;
    }
  },
  async setLastSent(info: LastSentInfo): Promise<void> {
    await localStorageService.setString(
      SLEEP_NOTIF_LAST_KEY,
      JSON.stringify(info)
    );
  },

  // Evaluate and present at most one insight now
  async evaluateAndNotifyNow(): Promise<InsightCandidate | null> {
    try {
      const enabled = await SleepHealthNotifier.isEnabled();
      if (!enabled) return null;

      const ok = await requestNotificationPermissions();
      if (!ok) return null;

      // Ensure up-to-date history (non-blocking if already fresh)
      await healthDataService.syncNeeded(30);
      const history = await healthDataService.getHistory(30);
      const candidates = evaluateSleepHealthInsights(history);
      if (!candidates.length) return null;

      // Frequency cap
      const last = await SleepHealthNotifier.getLastSent();
      const latest = history.snapshots[history.snapshots.length - 1];
      const today = latest?.date;
      if (!today) return null;
      if (last?.date) {
        const diff = differenceInCalendarDays(
          new Date(`${today}T00:00:00`),
          new Date(`${last.date}T00:00:00`)
        );
        if (diff < SLEEP_NOTIF_MIN_DAYS_BETWEEN) return null;
      }

      // Allow at most one per day; potential future: increase gap to few days based on severity
      // Pick the top candidate (already sorted by tier priority)
      const chosen = candidates[0];

      // Store alert and present concise push that routes to Alerts screen
      const alert = buildAlertFromCandidate(chosen);
      await AlertsService.add(alert);
      const mod = await import('expo-notifications');
      await mod.scheduleNotificationAsync({
        content: {
          title: alert.title,
          body: alert.shortBody,
          data: { alertId: alert.id, type: alert.type },
        },
        trigger: null,
      });

      await SleepHealthNotifier.setLastSent({ id: chosen.id, date: today });
      return chosen;
    } catch {
      return null;
    }
  },

  // Debug helper: send a sample notification without affecting frequency cap
  async sendSampleNow(): Promise<void> {
    try {
      const ok = await requestNotificationPermissions();
      if (!ok) return;
      // Try to send one of the real candidates
      await healthDataService.syncNeeded(30);
      const history = await healthDataService.getHistory(30);
      const candidates = evaluateSleepHealthInsights(history);
      if (candidates.length) {
        const chosen = candidates[0];
        const alert = buildAlertFromCandidate(chosen);
        await AlertsService.add(alert);
        const mod = await import('expo-notifications');
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
      // Fallback minimal sample that also adds to Alerts
      const sample: AlertItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'sleep_health',
        createdAt: new Date().toISOString(),
        title: 'Sample Sleep Insight (Debug)',
        shortBody: 'Preview how a sleep insight will appear in your alerts.',
        longBody:
          'This is a preview of a sleep insight. Actual insights are personalized based on your recent sleep and health patterns, and always include a source.',
        severity: 'low',
        dismissed: false,
      };
      await AlertsService.add(sample);
      const mod = await import('expo-notifications');
      await mod.scheduleNotificationAsync({
        content: {
          title: sample.title,
          body: sample.shortBody,
          data: { alertId: sample.id, type: sample.type, debug: true },
        },
        trigger: null,
      });
    } catch {
      // noop
    }
  },
};

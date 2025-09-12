import { healthDataService } from './HealthDataService';
import { localStorageService } from './LocalStorageService';
import { requestNotificationPermissions } from './notifications';
import {
  evaluateSleepHealthInsights,
  InsightCandidate,
} from './insights/SleepHealthInsights';
import { differenceInCalendarDays } from 'date-fns';

// Keys in secure local storage
const SLEEP_NOTIF_LAST_KEY = 'sleep.notif.last';
const SLEEP_NOTIF_MIN_DAYS_BETWEEN = 1; // Frequency cap: min full days between

type LastSentInfo = {
  id: string;
  date: string; // YYYY-MM-DD
};

function formatNotificationBody(c: InsightCandidate): string {
  const src = `Source: ${c.source}`;
  const privacy = c.dataNote
    ? `${c.dataNote} Your data stays on your device and is used only for personal insights.`
    : 'Your data stays on your device and is used only for personal insights.';
  // Keep concise; append source and short privacy note
  return `${c.body}\n\n${src}\n${c.sourceUrl}\n\n${privacy}`;
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

      // Present immediately (foreground notifications are handled by handler)
      const mod = await import('expo-notifications');
      await mod.scheduleNotificationAsync({
        content: {
          title: chosen.title,
          body: formatNotificationBody(chosen),
          data: {
            sourceUrl: chosen.sourceUrl,
            id: chosen.id,
            tier: chosen.tier,
          },
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
      const mod = await import('expo-notifications');
      await mod.scheduleNotificationAsync({
        content: {
          title: 'Sample Sleep Insight (Debug)',
          body: "Here's a sample insight to preview formatting. Keeping a consistent bedtime can support deeper, more restorative sleep.\n\nSource: Johns Hopkins Medicine\nhttps://www.hopkinsmedicine.org/health/wellness-and-prevention/sticking-to-a-sleep-schedule\n\nThis preview uses only local data and does not leave your device.",
          data: { debug: true },
        },
        trigger: null,
      });
    } catch {
      // noop
    }
  },
};

import { AlertItem } from '../models/Alert';
import { NotificationRuleEngine } from './NotificationRuleEngine';
import { buildNotificationRules } from './notificationRules';
import { localStorageService } from './LocalStorageService';
import { healthDataService } from './HealthDataService';
import type { HydrationState } from '../store/hydrationStore';
import { useHydrationStore } from '../store/hydrationStore';
import type { HealthSnapshot } from '../models/Health';

const engine = new NotificationRuleEngine(buildNotificationRules());

function computeIsSleeping(
  snapshot: HealthSnapshot | null,
  now: Date
): boolean {
  if (!snapshot) return false;
  const start = snapshot.sleepStart ? new Date(snapshot.sleepStart) : null;
  const end = snapshot.sleepEnd ? new Date(snapshot.sleepEnd) : null;
  if (start && end) {
    if (start <= end) {
      return now >= start && now < end;
    }
    // Handle potential data quirks where end is before start
    return now >= start || now < end;
  }
  if (end) {
    return now < end;
  }
  return false;
}

async function buildContext(now: Date) {
  const profile = await localStorageService.getUserProfile();
  const latestSnapshot = await healthDataService.syncNeeded(30, now);
  const history = await healthDataService.getHistory(30);
  let hydrationState: HydrationState | null = null;
  try {
    hydrationState = useHydrationStore.getState();
  } catch (error) {
    console.warn(
      '[NotificationOrchestrator] Failed to read hydration state',
      error
    );
  }

  return {
    now,
    profile,
    latestSnapshot,
    healthHistory: history,
    hydrationState,
    isUserSleeping: computeIsSleeping(latestSnapshot, now),
  };
}

export type NotificationRunOptions = {
  allowedRules?: string[];
};

export async function runNotificationRules(
  options: NotificationRunOptions = {}
): Promise<AlertItem[]> {
  const now = new Date();
  const context = await buildContext(now);

  return await NotificationRuleEngine.dispatch(engine, context, {
    allowedRules: options.allowedRules,
  });
}

import { differenceInCalendarDays, differenceInMinutes } from 'date-fns';
import { AlertItem, AlertType } from '../models/Alert';
import { AlertsService } from './AlertsService';
import { localStorageService } from './LocalStorageService';
import { requestNotificationPermissions } from './notifications';
import { yyyymmddInTimeZone, getDeviceTimeZone } from '../utils/datetimeUtils';
import type { UserProfile } from '../models/User';
import type { HealthHistory, HealthSnapshot } from '../models/Health';
import type { HydrationState } from '../store/hydrationStore';

type QuietHours = {
  startHour: number; // inclusive, 0-23
  endHour: number; // exclusive, 0-24 (can wrap past midnight)
};

export type NotificationPushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type AlertDraft = Omit<
  AlertItem,
  'id' | 'createdAt' | 'dismissed' | 'shortBody'
> & {
  shortBody?: string;
};

export type NotificationRuleResult = {
  alert: AlertDraft;
  push?: NotificationPushPayload;
};

export type NotificationRuleConstraints = {
  oncePerDay?: boolean;
  minIntervalMinutes?: number;
  minDaysBetween?: number;
  quietHours?: QuietHours;
  requireAwake?: boolean;
};

export type NotificationRuleContext = {
  now: Date;
  timeZone: string;
  today: string;
  profile: UserProfile | null;
  healthHistory: HealthHistory | null;
  latestSnapshot: HealthSnapshot | null;
  hydrationState: HydrationState | null;
  isUserSleeping: boolean;
};

export type NotificationRule = {
  id: string;
  type: AlertType;
  priority: number;
  description?: string;
  constraints?: NotificationRuleConstraints;
  evaluate: (
    ctx: NotificationRuleContext
  ) => Promise<NotificationRuleResult | null>;
};

type StoredState = {
  lastSent: Record<string, string>; // ruleKey -> ISO timestamp
};

const STORAGE_KEY = 'notifications.ruleState.v1';
const MAX_NOTIFICATIONS_PER_RUN = 3;

function isWithinQuietHours(now: Date, quietHours: QuietHours): boolean {
  const hour = now.getHours() + now.getMinutes() / 60;
  const { startHour, endHour } = quietHours;
  if (startHour === endHour) return true; // entire day quiet
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  // wraps past midnight
  return hour >= startHour || hour < endHour;
}

function getStorageKey(ruleId: string, dedupeKey?: string): string {
  return dedupeKey ? `${ruleId}::${dedupeKey}` : ruleId;
}

async function loadState(): Promise<StoredState> {
  try {
    const raw = await localStorageService.getString(STORAGE_KEY);
    if (!raw) return { lastSent: {} };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      lastSent: parsed.lastSent ?? {},
    };
  } catch (error) {
    console.warn('[NotificationRuleEngine] Failed to load state', error);
    return { lastSent: {} };
  }
}

async function saveState(state: StoredState): Promise<void> {
  try {
    await localStorageService.setString(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[NotificationRuleEngine] Failed to save state', error);
  }
}

function buildAlertItem(draft: AlertDraft): AlertItem {
  return {
    id: draft.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type: draft.type,
    createdAt: new Date().toISOString(),
    title: draft.title,
    shortBody: draft.shortBody ?? draft.longBody,
    longBody: draft.longBody,
    sourceName: draft.sourceName,
    sourceUrl: draft.sourceUrl,
    tier: draft.tier,
    dataNote: draft.dataNote,
    severity: draft.severity,
    dedupeKey: draft.dedupeKey,
  };
}

function hasSatisfiedOncePerDay(
  key: string,
  state: StoredState,
  today: string,
  timeZone: string
): boolean {
  const last = state.lastSent[key];
  if (!last) return false;
  const lastDay = yyyymmddInTimeZone(new Date(last), timeZone);
  return lastDay === today;
}

function hasSatisfiedMinDays(
  key: string,
  state: StoredState,
  now: Date
): number {
  const last = state.lastSent[key];
  if (!last) return Infinity;
  const diff = differenceInCalendarDays(now, new Date(last));
  return diff;
}

function hasSatisfiedMinInterval(
  key: string,
  state: StoredState,
  now: Date
): number {
  const last = state.lastSent[key];
  if (!last) return Infinity;
  return differenceInMinutes(now, new Date(last));
}

export class NotificationRuleEngine {
  private rules: NotificationRule[];

  constructor(rules: NotificationRule[]) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  async evaluate(
    ctx: Omit<NotificationRuleContext, 'timeZone' | 'today'> & {
      timeZone?: string;
      today?: string;
    },
    options?: { allowedRules?: string[] }
  ): Promise<NotificationRuleResult[]> {
    const timeZone = ctx.timeZone ?? getDeviceTimeZone();
    const today = ctx.today ?? yyyymmddInTimeZone(ctx.now, timeZone);

    const fullCtx: NotificationRuleContext = {
      ...ctx,
      timeZone,
      today,
    };

    const state = await loadState();
    const results: NotificationRuleResult[] = [];
    const allowedRules = options?.allowedRules;

    for (const rule of this.rules) {
      if (allowedRules && !allowedRules.includes(rule.id)) {
        continue;
      }
      if (results.length >= MAX_NOTIFICATIONS_PER_RUN) {
        break;
      }
      const ruleKey = getStorageKey(rule.id);
      const constraints = rule.constraints ?? {};

      if (
        constraints.quietHours &&
        isWithinQuietHours(fullCtx.now, constraints.quietHours)
      ) {
        continue;
      }
      if (constraints.requireAwake && fullCtx.isUserSleeping) {
        continue;
      }
      if (
        constraints.oncePerDay &&
        hasSatisfiedOncePerDay(ruleKey, state, today, timeZone)
      ) {
        continue;
      }
      if (
        typeof constraints.minDaysBetween === 'number' &&
        hasSatisfiedMinDays(ruleKey, state, fullCtx.now) <
          constraints.minDaysBetween
      ) {
        continue;
      }
      if (
        typeof constraints.minIntervalMinutes === 'number' &&
        hasSatisfiedMinInterval(ruleKey, state, fullCtx.now) <
          constraints.minIntervalMinutes
      ) {
        continue;
      }

      try {
        const outcome = await rule.evaluate(fullCtx);
        if (!outcome) continue;
        const dedupeKey = outcome.alert.dedupeKey;
        const storageKey = getStorageKey(rule.id, dedupeKey);
        if (
          constraints.oncePerDay &&
          hasSatisfiedOncePerDay(storageKey, state, today, timeZone)
        ) {
          continue;
        }
        if (
          typeof constraints.minDaysBetween === 'number' &&
          hasSatisfiedMinDays(storageKey, state, fullCtx.now) <
            constraints.minDaysBetween
        ) {
          continue;
        }
        if (
          typeof constraints.minIntervalMinutes === 'number' &&
          hasSatisfiedMinInterval(storageKey, state, fullCtx.now) <
            constraints.minIntervalMinutes
        ) {
          continue;
        }

        const iso = fullCtx.now.toISOString();
        state.lastSent[storageKey] = iso;
        state.lastSent[ruleKey] = iso;
        results.push(outcome);
      } catch (error) {
        console.warn(
          `[NotificationRuleEngine] Rule ${rule.id} failed to evaluate`,
          error
        );
      }
    }

    if (results.length > 0) {
      await saveState(state);
    }

    return results;
  }

  static async dispatch(
    engine: NotificationRuleEngine,
    ctx: Omit<NotificationRuleContext, 'timeZone' | 'today'>,
    options?: { allowedRules?: string[] }
  ): Promise<AlertItem[]> {
    const results = await engine.evaluate(ctx, options);
    if (!results.length) return [];

    const delivered: AlertItem[] = [];
    const ok = await requestNotificationPermissions();
    const mod = ok ? await import('expo-notifications') : null;

    let offsetMinutes = 0;

    for (const result of results) {
      const alert = buildAlertItem(result.alert);
      await AlertsService.add(alert);
      delivered.push(alert);

      if (mod && result.push) {
        try {
          await mod.scheduleNotificationAsync({
            content: {
              title: result.push.title,
              body: result.push.body,
              data: {
                alertId: alert.id,
                type: alert.type,
                ...(result.push.data ?? {}),
              },
            },
            trigger: offsetMinutes > 0 ? { seconds: offsetMinutes * 60 } : null,
          });
        } catch (error) {
          console.warn(
            '[NotificationRuleEngine] Failed to schedule push',
            error
          );
        }
      }
      offsetMinutes += 5; // stagger subsequent notifications by 5 minutes
    }
    return delivered;
  }
}

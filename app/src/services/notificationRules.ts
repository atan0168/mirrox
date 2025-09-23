import { NotificationRule } from './NotificationRuleEngine';
import { evaluateSleepHealthInsights } from './insights/SleepHealthInsights';
import { SLEEP_NOTIF_MIN_DAYS_BETWEEN } from '../constants';
import { truncate } from '../utils/notificationUtils';
import { backendApiService } from './BackendApiService';
import type { NotificationRuleContext } from './NotificationRuleEngine';

function tierToSeverity(tier: 1 | 2 | 3): 'high' | 'medium' | 'low' {
  return tier === 1 ? 'high' : tier === 2 ? 'medium' : 'low';
}

function buildSleepRule(): NotificationRule {
  return {
    id: 'sleep.health.daily',
    type: 'sleep_health',
    priority: 300,
    constraints: {
      oncePerDay: true,
      minDaysBetween: SLEEP_NOTIF_MIN_DAYS_BETWEEN,
      quietHours: { startHour: 22, endHour: 6 },
      requireAwake: true,
    },
    evaluate: async ctx => {
      if (ctx.profile?.preferences?.enableSleepHealthNotifications === false) {
        return null;
      }
      if (!ctx.healthHistory || !ctx.healthHistory.snapshots.length) {
        return null;
      }
      const candidates = evaluateSleepHealthInsights(ctx.healthHistory);
      if (!candidates.length) {
        return null;
      }
      const chosen = candidates[0];
      return {
        alert: {
          type: 'sleep_health',
          title: chosen.title,
          shortBody: truncate(chosen.body, 120),
          longBody: chosen.body,
          sourceName: chosen.source,
          sourceUrl: chosen.sourceUrl,
          tier: chosen.tier,
          dataNote: chosen.dataNote,
          severity: tierToSeverity(chosen.tier),
          dedupeKey: chosen.id,
        },
        push: {
          title: chosen.title,
          body: truncate(chosen.body, 120),
          data: { ruleId: 'sleep.health.daily' },
        },
      };
    },
  };
}

function shouldSendHydration(ctx: NotificationRuleContext): boolean {
  const state = ctx.hydrationState;
  if (!state) return false;
  if (state.currentDay !== ctx.today) return false;
  const progress = state.getProgressPercentage();
  if (!Number.isFinite(progress)) return false;
  if (progress >= 80) return false;
  const hour = ctx.now.getHours();
  if (hour < 9 || hour > 20) return false;
  // Encourage if morning but progress extremely low, or later day and below 60%
  if (hour < 12) {
    return progress < 40;
  }
  return progress < 60;
}

function buildHydrationRule(): NotificationRule {
  return {
    id: 'hydration.nudge',
    type: 'hydration',
    priority: 200,
    constraints: {
      oncePerDay: true,
      minIntervalMinutes: 90,
      quietHours: { startHour: 21, endHour: 7 },
      requireAwake: true,
    },
    evaluate: async ctx => {
      if (!shouldSendHydration(ctx)) {
        return null;
      }
      const state = ctx.hydrationState!;
      const progress = Math.round(state.getProgressPercentage());
      const deficitMl = Math.max(
        0,
        state.dailyGoalMl - state.currentHydrationMl
      );
      const coachingLine =
        progress <= 30
          ? "You're still near the start of today's hydration goal. A glass of water could feel refreshing."
          : "You're a bit behind on hydration today. A steady sip now can help you feel better later.";
      const shortBody = `${progress}% of today's goal reached. Take a sip now.`;
      const longBody =
        `You're at about ${progress}% of today's hydration goal with roughly ${Math.max(0, deficitMl)}mL to go. ` +
        'Keeping intake steady helps energy and focus through the day.';
      return {
        alert: {
          type: 'hydration',
          title: 'Time for a hydration break',
          shortBody,
          longBody,
          severity: 'low',
          dedupeKey: `hydration-${state.currentDay}-${state.dailyGoalMl}`,
        },
        push: {
          title: 'Hydration reminder',
          body: coachingLine,
          data: { ruleId: 'hydration.nudge' },
        },
      };
    },
  };
}

function buildDengueRule(): NotificationRule {
  return {
    id: 'dengue.cluster',
    type: 'dengue',
    priority: 150,
    constraints: {
      oncePerDay: true,
      minDaysBetween: 3,
      quietHours: { startHour: 21, endHour: 7 },
    },
    evaluate: async ctx => {
      const coords = ctx.profile?.location ?? null;
      if (!coords) return null;
      try {
        const response = await backendApiService.fetchDengueHotspots(
          coords.latitude,
          coords.longitude,
          10
        );
        const count = response?.features?.length ?? 0;
        if (count === 0) {
          return null;
        }
        const dedupeKey = `dengue-${coords.latitude.toFixed(2)}-${coords.longitude.toFixed(2)}`;
        return {
          alert: {
            type: 'dengue',
            title: 'Dengue clusters nearby',
            shortBody:
              'Repellent and removing standing water can help reduce mosquito bites.',
            longBody:
              'Local dengue clusters were reported in your area. Using mosquito repellent and clearing standing water can reduce bites. Source: Malaysia MOH & WHO.',
            severity: 'medium',
            sourceName: 'WHO Dengue prevention',
            sourceUrl:
              'https://www.who.int/health-topics/dengue-and-severe-dengue#tab=tab_2',
            dedupeKey,
          },
          push: {
            title: 'Dengue update',
            body: 'Heads up — dengue clusters were reported nearby.',
            data: { ruleId: 'dengue.cluster' },
          },
        };
      } catch (error) {
        console.warn(
          '[NotificationRules] Failed to fetch dengue hotspots',
          error
        );
        return null;
      }
    },
  };
}

export function buildNotificationRules(): NotificationRule[] {
  return [buildSleepRule(), buildHydrationRule(), buildDengueRule()];
}

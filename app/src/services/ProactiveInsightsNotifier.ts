import { localStorageService } from './LocalStorageService';
import { AlertsService } from './AlertsService';
import type { AlertItem, AlertSeverity, AlertType } from '../models/Alert';
import { truncate } from '../utils/notificationUtils';
import { healthDataService } from './HealthDataService';
import { apiService } from './ApiService';
import { trafficService } from './TrafficService';
import { backendApiService } from './BackendApiService';
import { requestNotificationPermissions } from './notifications';
import { differenceInCalendarDays } from 'date-fns';

// Frequency caps and keys
const LS_KEYS = {
  lastSentByKey: 'notifs.lastSentByKey.v1', // map dedupeKey -> ISO date (YYYY-MM-DD)
};

const MIN_DAYS_BETWEEN: Partial<Record<AlertType, number>> = {
  steps: 1,
  air_quality: 2,
  weather: 1,
  traffic: 2,
  dengue: 3,
  hydration: 1,
  stress: 1,
  system: 1,
  sleep_health: 1,
};

export type InsightBuildContext = {
  // Coordinates for env services
  latitude?: number;
  longitude?: number;
};

export type InsightCandidate = {
  id: string; // stable dedupe key per insight type + thresholds bucket + date scope
  type: AlertType;
  title: string;
  body: string;
  longBody?: string;
  severity: AlertSeverity;
  sourceName?: string;
  sourceUrl?: string;
  tier?: 1 | 2 | 3;
  dataNote?: string;
};

function todayKey(date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD in local-ish (UTC ok for daily cap)
}

async function getLastSentMap(): Promise<Record<string, string>> {
  const json = await localStorageService.getString(LS_KEYS.lastSentByKey);
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}
async function setLastSentMap(map: Record<string, string>) {
  await localStorageService.setString(
    LS_KEYS.lastSentByKey,
    JSON.stringify(map)
  );
}

function buildAlertFromCandidate(c: InsightCandidate): AlertItem {
  const longBody = c.longBody ?? c.body;
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: c.type,
    createdAt: new Date().toISOString(),
    title: c.title,
    shortBody: truncate(c.body, 120),
    longBody,
    sourceName: c.sourceName,
    sourceUrl: c.sourceUrl,
    tier: c.tier,
    dataNote: c.dataNote,
    severity: c.severity,
    dismissed: false,
    dedupeKey: c.id,
  };
}

export const ProactiveInsightsNotifier = {
  // Evaluate multiple domains and return the top candidate to notify now (optional push scheduling can be added)
  async evaluateAndStoreOne(
    ctx: InsightBuildContext = {}
  ): Promise<AlertItem | null> {
    try {
      const candidates: InsightCandidate[] = [];

      // Sleep/HRV/steps via health history
      const history = await healthDataService.getHistory(14);
      const latest = history.snapshots[history.snapshots.length - 1];
      const today = latest?.date ?? todayKey();

      if (latest.date !== today) {
        return null;
      }

      // Steps encouragement
      if (latest?.steps != null) {
        const steps = latest.steps;
        if (steps < 3000) {
          candidates.push({
            id: `steps_low`,
            type: 'steps',
            title: 'Nice time for a short walk',
            body: 'A 10-minute walk could feel refreshing. Short movement breaks can support your energy through the day.',
            longBody:
              'Taking a short walk can help maintain steady energy and mood. Even 10 minutes counts toward your daily movement. Source: CDC Physical Activity Guidelines',
            severity: 'low',
            sourceName: 'CDC',
            sourceUrl:
              'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html',
            tier: 3,
          });
        } else if (steps < 8000) {
          candidates.push({
            id: `steps_progress`,
            type: 'steps',
            title: 'Great progress — you’re on your way',
            body: 'You’re building up steady steps today. If it feels good, consider a light stroll later.',
            severity: 'low',
            sourceName: 'CDC',
            sourceUrl:
              'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html',
            tier: 3,
          });
        }
      }

      // Hydration suggestion from hydration store is internal; keep general guidance
      // Environmental insights (AQI / UV / temperature)
      if (ctx.latitude && ctx.longitude) {
        try {
          const aqi = await apiService.fetchAQICNAirQuality(
            ctx.latitude,
            ctx.longitude
          );
          if (aqi.aqi != null) {
            if (aqi.aqi >= 151) {
              candidates.push({
                id: `aqi_unhealthy`,
                type: 'air_quality',
                title: 'Air quality is a bit heavy right now',
                body: 'If you plan to be outdoors, a lighter activity or a mask could feel more comfortable today.',
                longBody:
                  'When AQI is in the unhealthy range, easing outdoor intensity and considering a mask can help you feel better. Source: US EPA Air Quality Index Basics',
                severity: 'medium',
                sourceName: 'US EPA',
                sourceUrl: 'https://www.airnow.gov/aqi/aqi-basics/',
                tier: 2,
              });
            } else if (aqi.aqi >= 101) {
              candidates.push({
                id: `aqi_moderate`,
                type: 'air_quality',
                title: 'Air quality is moderate',
                body: 'If you’re sensitive, you might feel better with gentler outdoor activity today.',
                severity: 'low',
                sourceName: 'US EPA',
                sourceUrl: 'https://www.airnow.gov/aqi/aqi-basics/',
                tier: 3,
              });
            }
            if (typeof aqi.uvIndex === 'number' && aqi.uvIndex >= 6) {
              candidates.push({
                id: `uv_high`,
                type: 'weather',
                title: 'UV index is high this afternoon',
                body: 'A hat or sunscreen could help you feel more comfortable if you’re heading out.',
                severity: 'low',
                sourceName: 'CDC',
                sourceUrl:
                  'https://www.cdc.gov/radiation-health/data-research/facts-stats/ultraviolet-radiation.html',
                tier: 3,
              });
            }
            if (typeof aqi.temperature === 'number' && aqi.temperature >= 30) {
              candidates.push({
                id: `heat`,
                type: 'weather',
                title: 'It’s a warm day',
                body: 'Sipping water regularly and lighter activities can help you stay comfortable.',
                severity: 'low',
                sourceName: 'CDC',
                sourceUrl: 'https://www.cdc.gov/heat-health/about/index.html',
                tier: 3,
              });
            }
          }
        } catch {}

        // Traffic
        try {
          const traffic = await trafficService.getCongestionFactor(
            ctx.latitude,
            ctx.longitude
          );
          if (traffic.congestionFactor >= 0.6) {
            candidates.push({
              id: `traffic_busy`,
              type: 'traffic',
              title: 'Traffic looks a bit busy nearby',
              body: 'If timing is flexible, leaving a little earlier or later could make the ride smoother.',
              severity: 'low',
              sourceName: 'TomTom (via Mirrox API)',
              sourceUrl: 'https://mirrox.iceon.top/api/traffic/status',
              tier: 3,
            });
          }
        } catch {}

        // Dengue (Malaysia)
        try {
          const dengueNearby = await backendApiService.fetchDengueHotspots(
            ctx.latitude,
            ctx.longitude,
            10
          );
          const count = dengueNearby?.features?.length ?? 0;
          if (count > 0) {
            candidates.push({
              id: `dengue_nearby`,
              type: 'dengue',
              title: 'Heads up — dengue clusters reported nearby',
              body: 'Using repellent and clearing standing water around the home can be helpful.',
              longBody:
                'Local dengue clusters were reported in your area. Simple steps like using mosquito repellent and removing standing water can reduce bites. Source: Malaysia MOH & WHO',
              severity: 'low',
              sourceName: 'WHO Dengue prevention',
              sourceUrl:
                'https://www.who.int/health-topics/dengue-and-severe-dengue#tab=tab_2',
              tier: 3,
            });
          }
        } catch {}
      }

      // HRV/Stress encouragement will be in a separate visual; keep supportive note
      if (latest?.hrvMs != null && latest.hrvMs < 60) {
        candidates.push({
          id: `stress_support`,
          type: 'stress',
          title: 'A mindful minute can feel nice',
          body: 'If you have a moment, a few calm breaths or a short pause could feel grounding.',
          severity: 'low',
          sourceName: 'NCCIH',
          sourceUrl:
            'https://newsinhealth.nih.gov/2021/06/mindfulness-your-health',
          tier: 3,
        });
      }

      // Rank by tier then severity
      candidates.sort((a, b) => (a.tier ?? 3) - (b.tier ?? 3));

      const map = await getLastSentMap();
      const todayStr = todayKey();
      for (const c of candidates) {
        const lastDate = map[c.id];
        const minGap = MIN_DAYS_BETWEEN[c.type] ?? 1;
        if (lastDate) {
          const diff = differenceInCalendarDays(
            new Date(`${todayStr}T00:00:00`),
            new Date(`${lastDate}T00:00:00`)
          );
          if (diff < minGap) continue;
        }
        // okay to send; record and store
        const alert = buildAlertFromCandidate(c);
        await AlertsService.add(alert);
        map[c.id] = todayStr;
        await setLastSentMap(map);
        // Optional push: one supportive push per day
        try {
          const ok = await requestNotificationPermissions();
          if (ok) {
            const mod = await import('expo-notifications');
            await mod.scheduleNotificationAsync({
              content: {
                title: alert.title,
                body: alert.shortBody,
                data: { alertId: alert.id, type: alert.type },
              },
              trigger: null,
            });
          }
        } catch {}
        return alert;
      }

      return null;
    } catch {
      return null;
    }
  },
};

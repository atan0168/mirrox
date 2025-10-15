import { create } from 'zustand';
import { subDays } from 'date-fns';
import { localDayString } from '../utils/datetimeUtils';
import type { HealthHistory, HealthSnapshot } from '../models/Health';
import type { AirQualityData } from '../models/AirQuality';
import type {
  ArcGISResponse,
  HotspotAttributes,
  PointGeometry,
  OutbreakAttributes,
  PolygonGeometry,
  DenguePredictResponse,
} from '../models/Dengue';
import { healthDataService } from '../services/HealthDataService';
import { registerSandboxStateAccessor } from '../sandbox/sandboxAccess';

type StressPreset = 'none' | 'moderate' | 'high';
type SleepPreset = 'optimal' | 'moderate' | 'low';
type AirQualityPreset = 'good' | 'moderate' | 'unhealthy';
type DenguePreset = 'none' | 'active';

interface StressProfile {
  hrv: number;
  rhr: number;
  mindful: number;
  steps: number;
  activeEnergy: number;
}

interface AirQualityProfile {
  aqi: number;
  classification: string;
  colorCode: string;
  pm25: number;
  pm10: number;
  uvIndex: number;
  temperature: number;
  humidity: number;
  healthAdvice: string;
}

interface SandboxContext {
  latitude?: number;
  longitude?: number;
  locality?: string | null;
  region?: string | null;
  countryCode?: string | null;
}

interface DengueBundle {
  hotspots: ArcGISResponse<HotspotAttributes, PointGeometry> | null;
  outbreaks: ArcGISResponse<OutbreakAttributes, PolygonGeometry> | null;
  prediction: {
    success: boolean;
    data?: DenguePredictResponse;
    error?: string;
  } | null;
}

interface SandboxState {
  enabled: boolean;
  stressPreset: StressPreset;
  sleepPreset: SleepPreset;
  airQualityPreset: AirQualityPreset;
  denguePreset: DenguePreset;
  context: SandboxContext;
  healthSnapshot: HealthSnapshot | null;
  healthHistory: HealthHistory | null;
  airQuality: AirQualityData | null;
  dengueHotspots: ArcGISResponse<HotspotAttributes, PointGeometry> | null;
  dengueOutbreaks: ArcGISResponse<OutbreakAttributes, PolygonGeometry> | null;
  denguePrediction: {
    success: boolean;
    data?: DenguePredictResponse;
    error?: string;
  } | null;
  setEnabled: (enabled: boolean, context?: SandboxContext) => void;
  setContext: (context: SandboxContext) => void;
  setStressPreset: (preset: StressPreset) => HealthSnapshot | null;
  setSleepPreset: (preset: SleepPreset) => HealthSnapshot | null;
  regenerateHealth: () => {
    snapshot: HealthSnapshot;
    history: HealthHistory;
  } | null;
  setAirQualityPreset: (
    preset: AirQualityPreset,
    contextOverride?: SandboxContext
  ) => AirQualityData | null;
  setDenguePreset: (
    preset: DenguePreset,
    contextOverride?: SandboxContext
  ) => DengueBundle;
}

const DEFAULT_CONTEXT: Required<SandboxContext> = {
  latitude: 3.139,
  longitude: 101.6869,
  locality: 'Kuala Lumpur',
  region: 'Selangor',
  countryCode: 'MY',
};

const STRESS_PROFILES: Record<StressPreset, StressProfile> = {
  none: { hrv: 78, rhr: 60, mindful: 22, steps: 7500, activeEnergy: 420 },
  moderate: { hrv: 52, rhr: 74, mindful: 6, steps: 4200, activeEnergy: 300 },
  high: { hrv: 32, rhr: 88, mindful: 0, steps: 2400, activeEnergy: 220 },
};

const SLEEP_PROFILES: Record<SleepPreset, number> = {
  optimal: 480,
  moderate: 390,
  low: 300,
};

const AIR_QUALITY_PRESETS: Record<AirQualityPreset, AirQualityProfile> = {
  good: {
    aqi: 42,
    classification: 'Good',
    colorCode: '#009966',
    pm25: 12,
    pm10: 28,
    uvIndex: 4,
    temperature: 25,
    humidity: 52,
    healthAdvice: 'Air quality is great today. Enjoy outdoor activities.',
  },
  moderate: {
    aqi: 97,
    classification: 'Moderate',
    colorCode: '#FFDE33',
    pm25: 48,
    pm10: 82,
    uvIndex: 6,
    temperature: 29,
    humidity: 64,
    healthAdvice: 'Sensitive groups should pace outdoor intensity today.',
  },
  unhealthy: {
    aqi: 165,
    classification: 'Unhealthy',
    colorCode: '#CC0033',
    pm25: 122,
    pm10: 168,
    uvIndex: 8,
    temperature: 31,
    humidity: 72,
    healthAdvice: 'Limit prolonged outdoor exertion and consider a mask.',
  },
};

function mergeContext(
  current: SandboxContext,
  next?: SandboxContext
): SandboxContext {
  if (!next) {
    return current;
  }
  return {
    latitude: next.latitude ?? current.latitude,
    longitude: next.longitude ?? current.longitude,
    locality: next.locality ?? current.locality,
    region: next.region ?? current.region,
    countryCode: next.countryCode ?? current.countryCode,
  };
}

function formatDate(date: Date): string {
  return localDayString(date);
}

function createSnapshot(
  date: Date,
  stress: StressProfile,
  sleepMinutes: number,
  finalized: boolean
): HealthSnapshot {
  const sleepHours = sleepMinutes / 60;
  return {
    date: formatDate(date),
    timestamp: new Date(date.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    platform: 'mock',
    steps: Math.round(stress.steps),
    sleepMinutes,
    finalized,
    sleepStart: null,
    sleepEnd: null,
    timeInBedMinutes: Math.round(sleepMinutes * 1.1),
    awakeningsCount: sleepHours < 6 ? 3 : 1,
    sleepLightMinutes: Math.round(sleepMinutes * 0.55),
    sleepDeepMinutes: Math.round(sleepMinutes * 0.2),
    sleepRemMinutes: Math.round(sleepMinutes * 0.15),
    hrvMs: stress.hrv,
    restingHeartRateBpm: stress.rhr,
    activeEnergyKcal: stress.activeEnergy,
    mindfulMinutes: stress.mindful,
    respiratoryRateBrpm: sleepHours < 6 ? 16 : 14,
    workoutsCount: sleepHours >= 7 ? 1 : 0,
  };
}

function buildHealthData(
  stressPreset: StressPreset,
  sleepPreset: SleepPreset
): { snapshot: HealthSnapshot; history: HealthHistory } {
  const today = new Date();
  const historySnapshots: HealthSnapshot[] = [];
  for (let offset = 13; offset >= 1; offset -= 1) {
    const day = subDays(today, offset);
    historySnapshots.push(
      createSnapshot(day, STRESS_PROFILES.none, SLEEP_PROFILES.optimal, true)
    );
  }
  const todaySnapshot = createSnapshot(
    today,
    STRESS_PROFILES[stressPreset],
    SLEEP_PROFILES[sleepPreset],
    false
  );
  const history: HealthHistory = {
    snapshots: [...historySnapshots, todaySnapshot],
  };
  return { snapshot: todaySnapshot, history };
}

function buildAirQualityData(
  preset: AirQualityPreset,
  context: SandboxContext
): AirQualityData {
  const profile = AIR_QUALITY_PRESETS[preset];
  const latitude = context.latitude ?? DEFAULT_CONTEXT.latitude;
  const longitude = context.longitude ?? DEFAULT_CONTEXT.longitude;
  const locality = context.locality ?? DEFAULT_CONTEXT.locality;
  const countryCode = context.countryCode ?? DEFAULT_CONTEXT.countryCode;
  return {
    location: {
      id: 0,
      name: `${locality} Sandbox Station`,
      locality,
      timezone: 'UTC',
      country: {
        id: 0,
        code: countryCode as string,
        name: countryCode === 'MY' ? 'Malaysia' : 'Sandbox',
      },
      coordinates: { latitude, longitude },
      sensors: [],
    },
    measurements: [],
    aqi: profile.aqi,
    primaryPollutant: 'pm25',
    pm25: profile.pm25,
    pm10: profile.pm10,
    no2: profile.aqi >= 150 ? 58 : 24,
    co: profile.aqi >= 150 ? 1.2 : 0.5,
    o3: profile.aqi >= 150 ? 72 : 38,
    uvIndex: profile.uvIndex,
    uvForecast: [
      {
        day: formatDate(new Date()),
        avg: profile.uvIndex,
        max: profile.uvIndex + 1,
        min: Math.max(0, profile.uvIndex - 1),
      },
    ],
    temperature: profile.temperature,
    humidity: profile.humidity,
    classification: profile.classification,
    colorCode: profile.colorCode,
    healthAdvice: profile.healthAdvice,
    source: 'aqicn',
    timestamp: new Date().toISOString(),
    stationUrl: 'https://sandbox.local/aqi',
    attributions: [
      {
        name: 'Sandbox AQICN Emulator',
        url: 'https://example.com',
      },
    ],
  };
}

function buildDengueData(
  preset: DenguePreset,
  context: SandboxContext
): DengueBundle {
  if (preset === 'none') {
    return { hotspots: null, outbreaks: null, prediction: null };
  }
  const latitude = context.latitude ?? DEFAULT_CONTEXT.latitude;
  const longitude = context.longitude ?? DEFAULT_CONTEXT.longitude;
  const locality = context.locality ?? DEFAULT_CONTEXT.locality;
  const region = context.region ?? DEFAULT_CONTEXT.region;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 3);
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 3);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.max(
    1,
    Math.ceil(
      ((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) +
        yearStart.getUTCDay() +
        1) /
        7
    )
  );

  const hotspots: ArcGISResponse<HotspotAttributes, PointGeometry> = {
    fields: [],
    features: [
      {
        attributes: {
          'SPWD.DBO_LOKALITI_POINTS.LOKALITI': `${locality} Block A`,
          'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES': 18,
          'SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK': 6,
        },
        geometry: { x: longitude + 0.01, y: latitude + 0.008 },
      },
      {
        attributes: {
          'SPWD.DBO_LOKALITI_POINTS.LOKALITI': `${locality} Park View`,
          'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES': 11,
          'SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK': 4,
        },
        geometry: { x: longitude - 0.008, y: latitude + 0.006 },
      },
    ],
  };

  const outbreaks: ArcGISResponse<OutbreakAttributes, PolygonGeometry> = {
    fields: [],
    features: [
      {
        attributes: {
          'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI': `${locality} Cluster`,
          'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES': 46,
        },
        geometry: {
          rings: [
            [
              [longitude - 0.015, latitude - 0.01],
              [longitude - 0.005, latitude + 0.012],
              [longitude + 0.018, latitude + 0.01],
              [longitude + 0.012, latitude - 0.012],
              [longitude - 0.015, latitude - 0.01],
            ],
          ],
        },
      },
    ],
  };

  const prediction: {
    success: boolean;
    data: DenguePredictResponse;
  } = {
    success: true,
    data: {
      state: region as string,
      as_of: {
        ew_year: now.getUTCFullYear(),
        ew: week,
        week_start: formatDate(weekStart),
        week_end: formatDate(weekEnd),
        source: 'Sandbox Forecaster',
      },
      season: {
        lags: 2,
        prob_in_season: 0.76,
        in_season: true,
        threshold: 0.55,
      },
      trend: {
        lags: 1,
        prob_trend_increase_next_week: 0.64,
        trend_increase: true,
        threshold: 0.55,
      },
    },
  };

  return {
    hotspots,
    outbreaks,
    prediction,
  };
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  enabled: false,
  stressPreset: 'none',
  sleepPreset: 'optimal',
  airQualityPreset: 'good',
  denguePreset: 'none',
  context: DEFAULT_CONTEXT,
  healthSnapshot: null,
  healthHistory: null,
  airQuality: buildAirQualityData('good', DEFAULT_CONTEXT),
  dengueHotspots: null,
  dengueOutbreaks: null,
  denguePrediction: null,
  setEnabled: (enabled, context) => {
    const state = get();
    const nextContext = mergeContext(state.context, context);
    if (state.enabled === enabled && !context) {
      return;
    }
    if (!enabled) {
      if (!state.enabled) {
        set({ context: nextContext });
        return;
      }
      healthDataService.setSandboxMode(false);
      set({
        enabled: false,
        context: nextContext,
      });
      return;
    }

    const { snapshot, history } = buildHealthData(
      state.stressPreset,
      state.sleepPreset
    );
    const airQuality = buildAirQualityData(state.airQualityPreset, nextContext);
    const dengue = buildDengueData(state.denguePreset, nextContext);

    healthDataService.setSandboxMode(true, {
      snapshot,
      history,
    });

    set({
      enabled: true,
      context: nextContext,
      healthSnapshot: snapshot,
      healthHistory: history,
      airQuality,
      dengueHotspots: dengue.hotspots,
      dengueOutbreaks: dengue.outbreaks,
      denguePrediction: dengue.prediction,
    });
  },
  setContext: context => {
    set(state => ({ context: mergeContext(state.context, context) }));
    const state = get();
    if (!state.enabled) {
      return;
    }
    const airQuality = buildAirQualityData(
      state.airQualityPreset,
      state.context
    );
    const dengue = buildDengueData(state.denguePreset, state.context);
    set({
      airQuality,
      dengueHotspots: dengue.hotspots,
      dengueOutbreaks: dengue.outbreaks,
      denguePrediction: dengue.prediction,
    });
  },
  setStressPreset: preset => {
    set({ stressPreset: preset });
    const result = get().regenerateHealth();
    return result ? result.snapshot : null;
  },
  setSleepPreset: preset => {
    set({ sleepPreset: preset });
    const result = get().regenerateHealth();
    return result ? result.snapshot : null;
  },
  regenerateHealth: () => {
    const state = get();
    const { snapshot, history } = buildHealthData(
      state.stressPreset,
      state.sleepPreset
    );
    set({ healthSnapshot: snapshot, healthHistory: history });
    if (state.enabled) {
      healthDataService.updateSandboxData(snapshot, history);
    }
    return { snapshot, history };
  },
  setAirQualityPreset: (preset, contextOverride) => {
    const state = get();
    const nextContext = mergeContext(state.context, contextOverride);
    const airQuality = buildAirQualityData(preset, nextContext);
    set({
      airQualityPreset: preset,
      context: nextContext,
      airQuality,
    });
    return airQuality;
  },
  setDenguePreset: (preset, contextOverride) => {
    const state = get();
    const nextContext = mergeContext(state.context, contextOverride);
    const dengue = buildDengueData(preset, nextContext);
    set({
      denguePreset: preset,
      context: nextContext,
      dengueHotspots: dengue.hotspots,
      dengueOutbreaks: dengue.outbreaks,
      denguePrediction: dengue.prediction,
    });
    return dengue;
  },
}));

registerSandboxStateAccessor(() => {
  const state = useSandboxStore.getState();
  return {
    enabled: state.enabled,
    airQuality: state.airQuality,
    dengueHotspots: state.dengueHotspots,
    dengueOutbreaks: state.dengueOutbreaks,
    denguePrediction: state.denguePrediction,
  };
});

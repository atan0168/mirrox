import { create } from 'zustand';

// Centralized store for avatar / 3D presentation state that may be
// shared across multiple screens or controls. Keep ONLY client-side
// ephemeral or UI-interaction state here (no server cached data).

export type WeatherOption = 'sunny' | 'cloudy' | 'rainy';
export type GlobalTimeOfDay = 'morning' | 'day' | 'evening' | 'night';

type MeterKey = 'fiber' | 'sugar' | 'fat' | 'sodium';
export type MeterState = Record<MeterKey, number>;
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

interface AvatarState {
  // Unified time-of-day override (independent of weather). Null = auto mapping.
  timeOfDayOverride: GlobalTimeOfDay | null;
  // Scheduler-computed current phase (always reflects real clock unless override is applied elsewhere)
  currentPhase: GlobalTimeOfDay;
  // Animation
  activeAnimation: string | null;
  isManualAnimation: boolean;
  sleepMode: boolean;

  // Environment controls
  overrideWeather: WeatherOption | null;

  // Loading state
  isAvatarLoading: boolean;
  loadingProgress: { loaded: number; total: number; item: string };

  // UI Modals
  showStressInfoModal: boolean;

  // Health meters
  meters: MeterState;

  // Actions
  setActiveAnimation: (anim: string | null, opts?: { manual?: boolean }) => void;
  clearManualAnimation: () => void;
  setSleepMode: (value: boolean) => void;
  setOverrideWeather: (weather: WeatherOption | null) => void;
  setAvatarLoading: (loading: boolean) => void;
  setLoadingProgress: (p: { loaded: number; total: number; item: string }) => void;
  setShowStressInfoModal: (v: boolean) => void;
  resetAnimations: () => void;
  setTimeOfDayOverride: (v: GlobalTimeOfDay | null) => void;
  setCurrentPhase: (p: GlobalTimeOfDay) => void;

  // Nutrition-related actions
  applyEffects: (effects: { meter: MeterKey; delta: number }[]) => void;
  setMeters: (partial: Partial<MeterState>) => void;
  resetMeters: (value?: number) => void;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  activeAnimation: null,
  isManualAnimation: false,
  sleepMode: false,
  overrideWeather: null,
  isAvatarLoading: false,
  loadingProgress: { loaded: 0, total: 0, item: '' },
  showStressInfoModal: false,
  timeOfDayOverride: null,
  currentPhase: 'morning',

  meters: { fiber: 50, sugar: 50, fat: 50, sodium: 50 },

  setActiveAnimation: (anim, opts) =>
    set({
      activeAnimation: anim,
      isManualAnimation: opts?.manual
        ? true
        : get().isManualAnimation && !!anim,
    }),
  clearManualAnimation: () => set({ isManualAnimation: false }),
  setSleepMode: (value) => set({ sleepMode: value }),
  setOverrideWeather: (weather) => set({ overrideWeather: weather }),
  setAvatarLoading: (loading) => set({ isAvatarLoading: loading }),
  setLoadingProgress: (p) => set({ loadingProgress: p }),
  setShowStressInfoModal: (v) => set({ showStressInfoModal: v }),
  resetAnimations: () => set({ activeAnimation: null, isManualAnimation: false }),
  setTimeOfDayOverride: (v) => set({ timeOfDayOverride: v }),
  setCurrentPhase: (p) => set({ currentPhase: p }),

  applyEffects: (effects) => {
    if (!effects?.length) return;
    const next = { ...get().meters };
    for (const e of effects) {
      if (!e || !(e.meter in next) || !Number.isFinite(e.delta)) continue;
      next[e.meter] = clamp(next[e.meter as MeterKey] + e.delta);
    }
    set({ meters: next });
  },

  setMeters: (partial) => set({ meters: { ...get().meters, ...partial } }),
  resetMeters: (value = 50) =>
    set({ meters: { fiber: value, sugar: value, fat: value, sodium: value } }),
}));

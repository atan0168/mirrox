import { create } from 'zustand';

// Centralized store for avatar / 3D presentation state that may be
// shared across multiple screens or controls. Keep ONLY client-side
// ephemeral or UI-interaction state here (no server cached data).

export type WeatherOption = 'sunny' | 'cloudy' | 'rainy';
export type GlobalTimeOfDay = 'morning' | 'day' | 'evening' | 'night';

type MeterKey = 'fiber' | 'sugar' | 'fat' | 'sodium';
export type MeterState = Record<MeterKey, number>;
const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

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

  // Manual facial expression override
  manualFacialExpression: string | null;
  isManualFacialExpression: boolean;

  // Eye-bags (dark circles) configuration
  eyeBagsOverrideEnabled: boolean; // when true, use override values; otherwise use auto values
  eyeBagsIntensity: number; // override intensity 0..1
  eyeBagsOffsetX: number; // override offsets/size only used when override enabled
  eyeBagsOffsetY: number;
  eyeBagsOffsetZ: number;
  eyeBagsWidth: number;
  eyeBagsHeight: number;
  eyeBagsAspectX: number;
  // Auto-derived eye-bags state (from health, etc.)
  eyeBagsAutoEnabled: boolean;
  eyeBagsAutoIntensity: number;
  // Health meters
  meters: MeterState;

  // Actions
  setActiveAnimation: (
    anim: string | null,
    opts?: { manual?: boolean }
  ) => void;
  clearManualAnimation: () => void;
  setSleepMode: (value: boolean) => void;
  setOverrideWeather: (weather: WeatherOption | null) => void;
  setAvatarLoading: (loading: boolean) => void;
  setLoadingProgress: (p: {
    loaded: number;
    total: number;
    item: string;
  }) => void;
  setShowStressInfoModal: (v: boolean) => void;
  resetAnimations: () => void;
  setTimeOfDayOverride: (v: GlobalTimeOfDay | null) => void;
  setCurrentPhase: (p: GlobalTimeOfDay) => void;

  // Facial expression override actions
  setManualFacialExpression: (expr: string | null) => void;
  clearManualFacialExpression: () => void;

  // Eye-bags actions
  setEyeBagsOverrideEnabled: (v: boolean) => void;
  setEyeBagsIntensity: (v: number) => void;
  setEyeBagsOffsets: (x: number, y: number, z: number) => void;
  setEyeBagsSize: (w: number, h: number) => void;
  setEyeBagsAspectX: (ax: number) => void;
  setEyeBagsAuto: (enabled: boolean, intensity: number) => void;
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
  manualFacialExpression: null,
  isManualFacialExpression: false,

  // Eye-bags defaults
  eyeBagsOverrideEnabled: false,
  eyeBagsIntensity: 0.6,
  eyeBagsOffsetX: 0.005,
  eyeBagsOffsetY: -0.025,
  eyeBagsOffsetZ: 0.025,
  eyeBagsWidth: 0.1,
  eyeBagsHeight: 0.05,
  eyeBagsAspectX: 1.6,
  eyeBagsAutoEnabled: false,
  eyeBagsAutoIntensity: 0.0,

  meters: { fiber: 50, sugar: 50, fat: 50, sodium: 50 },

  setActiveAnimation: (anim, opts) =>
    set({
      activeAnimation: anim,
      isManualAnimation: opts?.manual
        ? true
        : get().isManualAnimation && !!anim,
    }),
  clearManualAnimation: () => set({ isManualAnimation: false }),
  setSleepMode: value => set({ sleepMode: value }),
  setOverrideWeather: weather => set({ overrideWeather: weather }),
  setAvatarLoading: loading => set({ isAvatarLoading: loading }),
  setLoadingProgress: p => set({ loadingProgress: p }),
  setShowStressInfoModal: v => set({ showStressInfoModal: v }),
  resetAnimations: () =>
    set({ activeAnimation: null, isManualAnimation: false }),
  setTimeOfDayOverride: v => set({ timeOfDayOverride: v }),
  setCurrentPhase: p => set({ currentPhase: p }),

  setManualFacialExpression: expr =>
    set({
      manualFacialExpression: expr,
      isManualFacialExpression: expr !== null,
    }),
  clearManualFacialExpression: () =>
    set({ manualFacialExpression: null, isManualFacialExpression: false }),

  // Eye-bags actions
  setEyeBagsOverrideEnabled: v => set({ eyeBagsOverrideEnabled: v }),
  setEyeBagsIntensity: v =>
    set({ eyeBagsIntensity: Math.max(0, Math.min(1, v)) }),
  setEyeBagsOffsets: (x, y, z) =>
    set({ eyeBagsOffsetX: x, eyeBagsOffsetY: y, eyeBagsOffsetZ: z }),
  setEyeBagsSize: (w, h) => set({ eyeBagsWidth: w, eyeBagsHeight: h }),
  setEyeBagsAspectX: ax => set({ eyeBagsAspectX: ax }),
  setEyeBagsAuto: (enabled, intensity) =>
    set({
      eyeBagsAutoEnabled: enabled,
      eyeBagsAutoIntensity: Math.max(0, Math.min(1, intensity)),
    }),
  applyEffects: effects => {
    if (!effects?.length) return;
    const next = { ...get().meters };
    for (const e of effects) {
      if (!e || !(e.meter in next) || !Number.isFinite(e.delta)) continue;
      next[e.meter] = clamp(next[e.meter as MeterKey] + e.delta);
    }
    set({ meters: next });
  },

  setMeters: partial => set({ meters: { ...get().meters, ...partial } }),
  resetMeters: (value = 50) =>
    set({ meters: { fiber: value, sugar: value, fat: value, sodium: value } }),
}));

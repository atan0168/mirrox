import { create } from 'zustand';

// Centralized store for avatar / 3D presentation state that may be
// shared across multiple screens or controls. Keep ONLY client-side
// ephemeral or UI-interaction state here (no server cached data).

export type WeatherOption = 'sunny' | 'cloudy' | 'rainy';
export type GlobalTimeOfDay = 'morning' | 'day' | 'evening' | 'night';

interface AvatarState {
  // Unified time-of-day override (independent of weather). Null = auto mapping.
  // When null we derive morning/day/evening/night from local clock.
  timeOfDayOverride: GlobalTimeOfDay | null;
  // Animation
  activeAnimation: string | null;
  isManualAnimation: boolean; // User explicitly selected an animation
  sleepMode: boolean; // Time-window driven auto state

  // Environment controls (developer / UI driven)
  overrideWeather: WeatherOption | null;

  // Loading state (progress for avatar assets)
  isAvatarLoading: boolean;
  loadingProgress: { loaded: number; total: number; item: string };

  // UI Modals
  showStressInfoModal: boolean;

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
}));

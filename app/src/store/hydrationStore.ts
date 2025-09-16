import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localStorageService } from '../services/LocalStorageService';

export interface HydrationState {
  // Current hydration state for today
  currentHydrationMl: number; // Current hydration level (can be negative for dehydration)
  dailyGoalMl: number; // Daily hydration goal
  currentDay: string; // YYYY-MM-DD format
  lastActivitySync: string | null; // ISO timestamp of last activity-based deduction

  // Actions
  setDailyGoal: (goalMl: number) => void;
  logFluidIntake: (amountMl: number) => void;
  processActivityDeduction: (activityData: {
    type: string;
    durationMinutes: number;
    intensity: 'low' | 'moderate' | 'high' | 'very_high';
  }) => void;
  processNightlyDehydration: (sleepDurationMinutes: number) => void;
  processBasalFluidLoss: () => void;
  adjustGoalForClimate: (
    heatIndexCategory: 'normal' | 'caution' | 'extreme_caution' | 'danger'
  ) => void;
  resetForNewDay: (newDay: string, sleepDurationMinutes?: number) => void;

  // Computed getters
  getProgressPercentage: () => number;
  getHydrationStatus: () =>
    | 'severely_dehydrated'
    | 'dehydrated'
    | 'low'
    | 'adequate'
    | 'optimal'
    | 'over_hydrated';
}

const HYDRATION_PERSIST_KEY = 'hydration-state';

// Basal metabolic water loss per hour (mL)
const BASAL_FLUID_LOSS_PER_HOUR = 8; // Conservative estimate: ~192mL per day

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, get) => ({
      currentHydrationMl: 0,
      dailyGoalMl: 2000, // Default 2L
      currentDay: new Date().toISOString().split('T')[0],
      lastActivitySync: null,

      setDailyGoal: (goalMl: number) => {
        set({ dailyGoalMl: Math.max(500, Math.min(5000, goalMl)) }); // Reasonable bounds
      },

      logFluidIntake: (amountMl: number) => {
        set(state => ({
          currentHydrationMl: state.currentHydrationMl + Math.max(0, amountMl),
        }));
      },

      processActivityDeduction: activityData => {
        const { durationMinutes, intensity } = activityData;

        // Fluid loss rates per minute based on intensity (mL/min)
        const lossRates = {
          low: 3, // ~180mL/hour (light walking)
          moderate: 5, // ~300mL/hour (brisk walking, light jogging)
          high: 8, // ~480mL/hour (running, cycling)
          very_high: 12, // ~720mL/hour (intense exercise)
        };

        const fluidLoss = durationMinutes * lossRates[intensity];

        set(state => ({
          currentHydrationMl: state.currentHydrationMl - fluidLoss,
          lastActivitySync: new Date().toISOString(),
        }));
      },

      processNightlyDehydration: (sleepDurationMinutes: number) => {
        // Insensible water loss during sleep: ~0.5-1L over 8 hours
        // Conservative estimate: 60mL per hour of sleep
        const sleepFluidLoss = Math.round((sleepDurationMinutes / 60) * 60);

        set(state => ({
          currentHydrationMl: state.currentHydrationMl - sleepFluidLoss,
        }));
      },

      processBasalFluidLoss: () => {
        const now = new Date();
        const state = get();
        const lastUpdate = state.lastActivitySync
          ? new Date(state.lastActivitySync)
          : now;

        // Calculate hours since last update
        const hoursSinceUpdate = Math.max(
          0,
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
        );

        if (hoursSinceUpdate > 0.5) {
          // Only process if more than 30 minutes
          const basalLoss = Math.round(
            hoursSinceUpdate * BASAL_FLUID_LOSS_PER_HOUR
          );

          set({
            currentHydrationMl: state.currentHydrationMl - basalLoss,
            lastActivitySync: now.toISOString(),
          });
        }
      },

      adjustGoalForClimate: heatIndexCategory => {
        const state = get();
        let adjustmentFactor = 1.0;

        switch (heatIndexCategory) {
          case 'extreme_caution':
            adjustmentFactor = 1.15; // 15% increase
            break;
          case 'danger':
            adjustmentFactor = 1.2; // 20% increase
            break;
          default:
            adjustmentFactor = 1.0;
        }

        const adjustedGoal = Math.round(state.dailyGoalMl * adjustmentFactor);
        set({ dailyGoalMl: adjustedGoal });
      },

      resetForNewDay: (newDay: string, sleepDurationMinutes = 0) => {
        // Start new day with deficit from overnight dehydration
        const overnightDeficit =
          sleepDurationMinutes > 0
            ? -Math.round((sleepDurationMinutes / 60) * 60) // 60mL per hour of sleep
            : -500; // Default 500mL deficit if no sleep data

        set({
          currentDay: newDay,
          currentHydrationMl: overnightDeficit,
          lastActivitySync: new Date().toISOString(),
        });
      },

      getProgressPercentage: () => {
        const { currentHydrationMl: current, dailyGoalMl: goal } = get();
        if (!Number.isFinite(goal) || goal <= 0) return 0; // avoid div-by-zero / bad input

        const pct = (current / goal + 1) * 50; // -goal→0%, 0→50%, +goal→100%
        return Math.max(0, Math.min(200, pct)); // allow up to 200% if you want to show overshoot
      },

      getHydrationStatus: () => {
        const state = get();
        const progressPct = state.getProgressPercentage();

        if (progressPct < 25) return 'severely_dehydrated';
        if (progressPct < 50) return 'dehydrated';
        if (progressPct < 75) return 'low';
        if (progressPct < 100) return 'adequate';
        if (progressPct <= 120) return 'optimal';
        return 'over_hydrated';
      },
    }),
    {
      name: HYDRATION_PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await localStorageService.getString(name);
        },
        setItem: async (name: string, value: string) => {
          await localStorageService.setString(name, value);
        },
        removeItem: async (name: string) => {
          await localStorageService.remove(name);
        },
      })),
      partialize: state => ({
        currentHydrationMl: state.currentHydrationMl,
        dailyGoalMl: state.dailyGoalMl,
        currentDay: state.currentDay,
        lastActivitySync: state.lastActivitySync,
      }),
    }
  )
);

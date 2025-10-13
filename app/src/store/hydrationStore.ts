import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { HydrationStateRepository } from '../services/db/HydrationStateRepository';

export interface HydrationIntakeEntry {
  id: string;
  day: string; // YYYY-MM-DD format
  amountMl: number;
  fluidType?: string;
  timestamp: string; // ISO timestamp
}

export interface HydrationState {
  // Current hydration totals for the active day
  currentHydrationMl: number; // Sum of intake for the current day
  dailyGoalMl: number; // Climate-adjusted hydration goal for the day
  baselineGoalMl: number | null; // Baseline goal before climate adjustments
  currentDay: string; // YYYY-MM-DD format for the active tracking period
  intakeEntries: HydrationIntakeEntry[]; // All recorded intakes (historical)
  processedActivityIds: string[]; // Exercise sessions already applied to hydration

  // Actions
  setDailyGoal: (goalMl: number) => void;
  setBaselineGoal: (goalMl: number | null) => void;
  logFluidIntake: (params: {
    amountMl: number;
    fluidType?: string;
    timestamp?: string;
  }) => void;
  resetForNewDay: (newDay: string) => void;
  applyHydrationDeficitFromActivity: (params: {
    activityId: string;
    amountMl: number;
    timestamp?: string;
  }) => void;

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

import { localDayString } from '../utils/datetimeUtils';
const toDayString = (date: Date): string => localDayString(date);

const initialDay = toDayString(new Date());

const generateEntryId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sumIntakeForDay = (
  entries: HydrationIntakeEntry[],
  day: string
): number =>
  entries.reduce((total, entry) => {
    if (entry.day === day) {
      return total + entry.amountMl;
    }
    return total;
  }, 0);

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, get) => ({
      currentHydrationMl: 0,
      dailyGoalMl: 2000, // Default 2L baseline until we compute a personalised goal
      baselineGoalMl: null,
      currentDay: initialDay,
      intakeEntries: [],
      processedActivityIds: [],

      setDailyGoal: (goalMl: number) => {
        const safeGoal = Math.max(500, Math.min(5000, Math.round(goalMl)));
        set({ dailyGoalMl: safeGoal });
      },

      setBaselineGoal: (goalMl: number | null) => {
        if (goalMl == null) {
          set({ baselineGoalMl: null });
          return;
        }
        const safeGoal = Math.max(500, Math.min(5000, Math.round(goalMl)));
        set({ baselineGoalMl: safeGoal });
      },

      logFluidIntake: ({ amountMl, fluidType, timestamp }) => {
        const amount = Math.max(0, Math.round(amountMl));
        if (!Number.isFinite(amount) || amount <= 0) {
          return;
        }

        const now = timestamp ? new Date(timestamp) : new Date();
        const entryTimestamp = now.toISOString();
        const entryDay = toDayString(now);
        const entry: HydrationIntakeEntry = {
          id: generateEntryId(),
          day: entryDay,
          amountMl: amount,
          fluidType,
          timestamp: entryTimestamp,
        };

        set(state => {
          const updatedEntries = [...state.intakeEntries, entry];
          const isToday = entryDay === state.currentDay;
          const updatedHydration = isToday
            ? state.currentHydrationMl + amount
            : state.currentHydrationMl;

          return {
            intakeEntries: updatedEntries,
            currentHydrationMl: updatedHydration,
          };
        });
      },

      resetForNewDay: (newDay: string) => {
        set(state => ({
          currentDay: newDay,
          currentHydrationMl: sumIntakeForDay(state.intakeEntries, newDay),
        }));
      },

      applyHydrationDeficitFromActivity: ({ activityId, amountMl }) => {
        const safeAmount = Math.max(0, Math.round(amountMl));
        if (!safeAmount) {
          return;
        }

        const key = activityId || `activity-${Date.now()}`;

        set(state => {
          if (state.processedActivityIds.includes(key)) {
            return {};
          }

          const updatedIds = [...state.processedActivityIds, key].slice(-50);

          return {
            currentHydrationMl: state.currentHydrationMl - safeAmount,
            processedActivityIds: updatedIds,
          };
        });
      },

      getProgressPercentage: () => {
        const { currentHydrationMl: current, dailyGoalMl: goal } = get();
        if (!Number.isFinite(goal) || goal <= 0) return 0; // avoid div-by-zero / bad input

        const pct = (current / goal) * 100;
        return Math.max(0, Math.min(200, pct)); // cap displayed progress to 200%
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
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await HydrationStateRepository.get(name);
        },
        setItem: async (name: string, value: string) => {
          await HydrationStateRepository.set(name, value);
        },
        removeItem: async (name: string) => {
          await HydrationStateRepository.remove(name);
        },
      })),
      partialize: state => ({
        currentHydrationMl: state.currentHydrationMl,
        dailyGoalMl: state.dailyGoalMl,
        baselineGoalMl: state.baselineGoalMl,
        currentDay: state.currentDay,
        intakeEntries: state.intakeEntries,
        processedActivityIds: state.processedActivityIds,
      }),
    }
  )
);

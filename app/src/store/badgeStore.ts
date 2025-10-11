// Single source of truth for badges: definitions, persistence, and award helpers.

import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import { localStorageService } from '../services/LocalStorageService';

/** Unify storage backend (Web LocalStorage or RN MMKV via your service) */
const mmkvStorage: StateStorage = {
  getItem: async (name: string) => {
    const v = await localStorageService.getString(name);
    return v ?? null;
  },
  setItem: async (name: string, value: string) => {
    await localStorageService.setString(name, value);
  },
  removeItem: async (name: string) => {
    await localStorageService.remove(name);
  },
};

export type BadgeId =
  | 'streak7_drink'
  | 'streak7_mask'
  | 'streak7_walk'
  | 'streak7_breathe'
  | 'streak7_gratitude';

export type BadgeRecord = {
  id: BadgeId;
  earnedAt: string; // ISO timestamp
};

type BadgeState = {
  /** All earned badges (append-only list) */
  earned: BadgeRecord[];

  /** Check if a badge was already earned */
  has: (id: BadgeId) => boolean;

  /** Award a badge if not already earned */
  award: (id: BadgeId) => void;

  /** (Optional) clear all badges - useful for QA */
  clearAll: () => void;
};

export const BADGE_DEFS: Record<
  BadgeId,
  {
    title: string;
    encouragement: string;
    points: number;
    desc: string;
    icon: string;
  }
> = {
  streak7_drink: {
    title: '7-Day Hydration Master',
    encouragement: 'Amazing streak—your twin looks more radiant and resilient.',
    points: 40,
    desc: 'Completed “Drink 2L of water” for 7 consecutive days.',
    icon: '💧',
  },
  streak7_mask: {
    title: 'Smog-Free Survival Hero',
    encouragement: 'Your twin stands stronger against the haze. Keep it up!',
    points: 40,
    desc: 'Wore a protective mask on hazy days for 7 consecutive days.',
    icon: '😷',
  },
  streak7_walk: {
    title: 'Nature Explorer',
    encouragement: '7 days of nature time—grounded and refreshed!',
    points: 40,
    desc: 'Completed “10-min walk outdoors” for 7 consecutive days.',
    icon: '🚶‍♂️',
  },
  streak7_breathe: {
    title: 'Calm Master',
    encouragement: '7 days of calm breaths—mind like water.',
    points: 40,
    desc: 'Completed “5-min calm breathing” for 7 consecutive days.',
    icon: '🌬️',
  },
  streak7_gratitude: {
    title: 'Gratitude Champion',
    encouragement: 'A grateful week—warmth radiates from your twin!',
    points: 40,
    desc: 'Wrote a gratitude note for 7 consecutive days.',
    icon: '💖',
  },
};

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      earned: [],

      has: id => get().earned.some(b => b.id === id),

      award: id => {
        if (get().has(id)) return;
        set(s => ({
          earned: [...s.earned, { id, earnedAt: new Date().toISOString() }],
        }));
      },

      clearAll: () => set({ earned: [] }),
    }),
    {
      name: 'badge-store-v1',
      storage: createJSONStorage(() => mmkvStorage),
      // You can add a version/migrate if you later rename BadgeId keys.
    }
  )
);

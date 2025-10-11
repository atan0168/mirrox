// src/store/useQuestStore.ts
// Quest progress, streaks, points, history, and visual effects.
// Badge awarding is delegated to badgeStore (single source of truth).

import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import dayjs from 'dayjs';
import {
  QuestDef,
  QuestId,
  QuestProgress,
  Streak,
  CompletedLog,
  RewardTag,
  VisualEffectEvent,
} from '../models/quest';
import { appendQuestHistory } from '../services/QuestService';
import { localStorageService } from '../services/LocalStorageService';
import { useBadgeStore, BADGE_DEFS, type BadgeId } from './badgeStore';

/** Unify storage backend for web/RN */
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

const todayKey = () => dayjs().format('YYYY-MM-DD');
const keyFor = (questId: QuestId) => `${questId}::${todayKey()}`;

type PointsState = Record<RewardTag, number>;

type State = {
  quests: QuestDef[];
  progress: Record<string, QuestProgress>;
  streaks: Record<QuestId, Streak>;
  /** badges removed from here; useBadgeStore is the single source of truth */
  points: PointsState; // accumulated points by tag
  history: CompletedLog[]; // UI history (newest first)
  recentEffects: VisualEffectEvent[]; // short queue for twin visuals
};

type Actions = {
  setQuests: (qs: QuestDef[]) => void;
  record: (questId: QuestId, delta: number) => void;
  markDone: (questId: QuestId, note?: string) => void; // note used for gratitude text
  resetIfNeeded: () => void; // UI reads today only; no destructive reset
};

/** Centralized badge awarding rules: which quest streak unlocks which badge */
const QUEST_BADGE_RULES: Array<{
  questId: QuestId;
  threshold: number; // consecutive days needed
  badgeId: BadgeId;
}> = [
  { questId: 'drink_2l', threshold: 7, badgeId: 'streak7_drink' },
  { questId: 'haze_mask_today', threshold: 7, badgeId: 'streak7_mask' },
  { questId: 'nature_walk_10m', threshold: 7, badgeId: 'streak7_walk' },
  { questId: 'calm_breath_5m', threshold: 7, badgeId: 'streak7_breathe' },
  { questId: 'gratitude_note', threshold: 7, badgeId: 'streak7_gratitude' },
];

export const useQuestStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      quests: [],
      progress: {},
      streaks: {} as Record<QuestId, Streak>,
      points: { skin: 0, lung: 0, stress: 0, calm: 0, happiness: 0 },
      history: [],
      recentEffects: [],

      setQuests: qs => set({ quests: qs }),

      record: (questId, delta) => {
        const q = get().quests.find(x => x.id === questId);
        if (!q) return;

        const k = keyFor(questId);
        const prev = get().progress[k];
        const value = Math.max(0, (prev?.value ?? 0) + delta);
        const done = value >= q.target;

        const updated: QuestProgress = {
          id: questId,
          dateKey: todayKey(),
          value,
          done,
          updatedAt: Date.now(),
        };

        set({ progress: { ...get().progress, [k]: updated } });

        if (done && !prev?.done) {
          completeQuest(q);
        }
      },

      markDone: (questId, note) => {
        const q = get().quests.find(x => x.id === questId);
        if (!q) return;

        const k = keyFor(questId);
        const updated: QuestProgress = {
          id: questId,
          dateKey: todayKey(),
          value: q.target,
          done: true,
          updatedAt: Date.now(),
        };

        set({ progress: { ...get().progress, [k]: updated } });
        completeQuest(q, note);
      },

      resetIfNeeded: () => {
        // No destructive reset needed. UI reads today's key only.
        // Keep historical progress for analytics if desired.
      },
    }),
    {
      name: 'quest-store-v1',
      storage: createJSONStorage(() => mmkvStorage),
      // partialize example if you want to persist only slices:
      // partialize: (s) => ({
      //   progress: s.progress, streaks: s.streaks,
      //   points: s.points, history: s.history
      // }),
    }
  )
);

// --- Internal: handles completion, streak, points, badge bridging, history, and visual effect ---
function completeQuest(q: QuestDef, note?: string) {
  const now = Date.now();
  const sMap = useQuestStore.getState().streaks;
  const pMap = useQuestStore.getState().points;
  const history = useQuestStore.getState().history;
  const effects = useQuestStore.getState().recentEffects;

  // 1) Streak update (consecutive days)
  const prev = sMap[q.id] ?? { id: q.id, count: 0, lastDate: '' };
  const today = todayKey();
  let count = prev.count;

  if (prev.lastDate === today) {
    // already counted today
  } else if (
    !prev.lastDate ||
    dayjs(prev.lastDate).isSame(dayjs(today).subtract(1, 'day'), 'day')
  ) {
    count += 1; // consecutive day
  } else {
    count = 1; // streak reset
  }

  const updatedStreak: Streak = { id: q.id, count, lastDate: today };
  useQuestStore.setState({ streaks: { ...sMap, [q.id]: updatedStreak } });

  // 2) Progressive reward: larger bonus for longer streaks
  let bonus = 0;
  if (count >= 7) bonus = 5;
  else if (count >= 3) bonus = 2;
  const totalReward = q.rewardPoints + bonus;

  const nextPoints: PointsState = {
    ...pMap,
    [q.rewardTag]: (pMap[q.rewardTag] ?? 0) + totalReward,
  };
  useQuestStore.setState({ points: nextPoints });

  // 3) Badge unlock bridge → delegate to badgeStore (single source of truth)
  const hit = QUEST_BADGE_RULES.find(
    r => r.questId === q.id && r.threshold === count
  );
  if (hit) {
    const badgeApi = useBadgeStore.getState();
    if (!badgeApi.has(hit.badgeId)) {
      badgeApi.award(hit.badgeId);

      // (Optional) push a user-facing "badge unlocked" entry into quest history
      const def = BADGE_DEFS[hit.badgeId];
      useQuestStore.setState({
        history: [
          {
            questId: q.id,
            title: `Badge Unlocked: ${def.title}`,
            rewardPoints: 0,
            rewardTag: q.rewardTag,
            completedAt: now,
            streakCount: count,
            note: def.encouragement,
          },
          ...useQuestStore.getState().history,
        ],
      });

      // (Optional) trigger a visual effect so Dashboard can play one-shot animation
      const eff: VisualEffectEvent = {
        id: `badge-${hit.badgeId}-${now}`,
        tag: q.rewardTag,
        addedAt: now,
      };
      useQuestStore.setState({
        recentEffects: [eff, ...useQuestStore.getState().recentEffects].slice(
          0,
          5
        ),
      });
    }
  }

  // 4) Append to in-memory UI history (quest completion itself)
  const log: CompletedLog = {
    questId: q.id,
    title: q.title,
    rewardPoints: totalReward,
    rewardTag: q.rewardTag,
    completedAt: now,
    streakCount: count,
    note,
  };
  useQuestStore.setState({ history: [log, ...history] }); // newest first

  // 5) Push a short-lived visual effect event for twin visuals
  const evt: VisualEffectEvent = {
    id: `eff-${q.id}-${now}`,
    tag: q.rewardTag,
    addedAt: now,
  };
  useQuestStore.setState({ recentEffects: [evt, ...effects].slice(0, 5) });

  // 6) Persist history to encrypted storage (no user identifiers)
  const todayStr = dayjs(now).format('YYYY-MM-DD');
  void appendQuestHistory({
    questId: q.id,
    date: todayStr,
    timestamp: now,
    title: q.title,
    rewardPoints: totalReward,
    rewardTag: q.rewardTag,
    note,
    streakCount: count,
  }).catch(e => {
    console.warn('[completeQuest] persist history failed:', e);
  });
}

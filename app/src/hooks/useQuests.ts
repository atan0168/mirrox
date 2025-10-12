import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuestRepository } from '../services/db/QuestRepository';
import { BadgeRepository } from '../services/db/BadgeRepository';
import type {
  QuestDef,
  QuestId,
  QuestProgress,
  Streak,
  CompletedLog,
  RewardTag,
} from '../models/quest';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { BADGE_DEFS, QUEST_BADGE_RULES } from '../constants/badges';
import { BADGES_KEY } from './useBadges';

export const QUEST_PROGRESS_KEY = ['quest-progress'] as const;
export const QUEST_STREAKS_KEY = ['quest-streaks'] as const;
export const QUEST_HISTORY_KEY = ['quest-history'] as const;
export const QUEST_POINTS_KEY = ['quest-points'] as const;

const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');

export const useQuestProgress = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUEST_PROGRESS_KEY,
    queryFn: async (): Promise<Record<string, QuestProgress>> => {
      const rows = await QuestRepository.getAllProgressForToday();
      const map: Record<string, QuestProgress> = {};
      rows.forEach(row => {
        const key = `${row.quest_id}::${row.date}`;
        map[key] = {
          id: row.quest_id as QuestId,
          dateKey: row.date,
          value: row.value,
          done: row.done === 1,
          updatedAt: row.updated_at,
        };
      });
      return map;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const recordMutation = useMutation({
    mutationFn: async ({
      questId,
      delta,
      target,
    }: {
      questId: QuestId;
      delta: number;
      target: number;
    }) => {
      const date = getTodayDate();
      const existing = await QuestRepository.getTodayProgress(questId);
      const currentValue = existing?.value ?? 0;
      const newValue = Math.max(0, currentValue + delta);
      const done = newValue >= target;

      await QuestRepository.upsertProgress(questId, date, newValue, done);

      return { questId, date, value: newValue, done, updatedAt: Date.now() };
    },
    onSuccess: data => {
      const key = `${data.questId}::${data.date}`;
      queryClient.setQueryData(
        QUEST_PROGRESS_KEY,
        (old: Record<string, QuestProgress> = {}) => ({
          ...old,
          [key]: {
            id: data.questId as QuestId,
            dateKey: data.date,
            value: data.value,
            done: data.done,
            updatedAt: data.updatedAt,
          },
        })
      );
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async ({
      questId,
      target,
    }: {
      questId: QuestId;
      target: number;
    }) => {
      const date = getTodayDate();
      await QuestRepository.upsertProgress(questId, date, target, true);
      return {
        questId,
        date,
        value: target,
        done: true,
        updatedAt: Date.now(),
      };
    },
    onSuccess: data => {
      const key = `${data.questId}::${data.date}`;
      queryClient.setQueryData(
        QUEST_PROGRESS_KEY,
        (old: Record<string, QuestProgress> = {}) => ({
          ...old,
          [key]: {
            id: data.questId as QuestId,
            dateKey: data.date,
            value: data.value,
            done: data.done,
            updatedAt: data.updatedAt,
          },
        })
      );
    },
  });

  return {
    progress: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
    record: recordMutation.mutateAsync,
    markDone: markDoneMutation.mutateAsync,
  };
};

export const useQuestStreaks = () => {
  const query = useQuery({
    queryKey: QUEST_STREAKS_KEY,
    queryFn: async (): Promise<Record<QuestId, Streak>> => {
      const rows = await QuestRepository.getAllStreaks();
      const map: Record<string, Streak> = {};
      rows.forEach(row => {
        map[row.quest_id] = {
          id: row.quest_id as QuestId,
          count: row.count,
          lastDate: row.last_date,
        };
      });
      return map as Record<QuestId, Streak>;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    streaks: query.data ?? ({} as Record<QuestId, Streak>),
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useQuestHistory = (limit = 50) => {
  const query = useQuery({
    queryKey: [...QUEST_HISTORY_KEY, limit],
    queryFn: async (): Promise<CompletedLog[]> => {
      const rows = await QuestRepository.getHistory(limit);
      return rows.map(row => ({
        questId: row.quest_id as QuestId,
        title: row.title ?? '',
        rewardPoints: row.reward_points ?? 0,
        rewardTag: (row.reward_tag ?? 'calm') as RewardTag,
        completedAt: row.timestamp,
        streakCount: row.streak_count ?? 0,
        note: row.note,
      }));
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useQuestPoints = () => {
  const query = useQuery({
    queryKey: QUEST_POINTS_KEY,
    queryFn: async (): Promise<Record<RewardTag, number>> => {
      const rows = await QuestRepository.getAllPoints();
      const points: Record<RewardTag, number> = {
        skin: 0,
        lung: 0,
        stress: 0,
        calm: 0,
        happiness: 0,
      };
      rows.forEach(row => {
        if (row.tag in points) {
          points[row.tag as RewardTag] = row.points;
        }
      });
      return points;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    points: query.data ?? {
      skin: 0,
      lung: 0,
      stress: 0,
      calm: 0,
      happiness: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useQuestComplete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questDef,
      note,
    }: {
      questDef: QuestDef;
      note?: string;
    }) => {
      const now = Date.now();
      const today = getTodayDate();

      const existingStreak = await QuestRepository.getStreak(questDef.id);
      let count = existingStreak?.count ?? 0;

      if (existingStreak?.last_date === today) {
      } else if (
        !existingStreak?.last_date ||
        isSameDay(parseISO(existingStreak.last_date), subDays(new Date(), 1))
      ) {
        count += 1;
      } else {
        count = 1;
      }

      await QuestRepository.upsertStreak(questDef.id, count, today);

      let bonus = 0;
      if (count >= 7) bonus = 5;
      else if (count >= 3) bonus = 2;
      const totalReward = questDef.rewardPoints + bonus;

      await QuestRepository.addPoints(questDef.rewardTag, totalReward);

      const badgeRule = QUEST_BADGE_RULES.find(
        r => r.questId === questDef.id && r.threshold === count
      );

      let badgeAwarded: {
        badgeId: string;
        title: string;
        encouragement: string;
      } | null = null;

      if (badgeRule) {
        const hasBadge = await BadgeRepository.hasId(badgeRule.badgeId);
        if (!hasBadge) {
          await BadgeRepository.award(badgeRule.badgeId);
          const badgeDef = BADGE_DEFS[badgeRule.badgeId];

          await QuestRepository.addHistory({
            questId: questDef.id,
            date: today,
            timestamp: now,
            title: `Badge Unlocked: ${badgeDef.title}`,
            rewardPoints: 0,
            rewardTag: questDef.rewardTag,
            note: badgeDef.encouragement,
            streakCount: count,
          });

          badgeAwarded = {
            badgeId: badgeRule.badgeId,
            title: badgeDef.title,
            encouragement: badgeDef.encouragement,
          };
        }
      }

      await QuestRepository.addHistory({
        questId: questDef.id,
        date: today,
        timestamp: now,
        title: questDef.title,
        rewardPoints: totalReward,
        rewardTag: questDef.rewardTag,
        note,
        streakCount: count,
      });

      return {
        questId: questDef.id,
        totalReward,
        count,
        badgeAwarded,
        timestamp: now,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEST_STREAKS_KEY });
      queryClient.invalidateQueries({ queryKey: QUEST_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: QUEST_POINTS_KEY });
      queryClient.invalidateQueries({ queryKey: BADGES_KEY });
    },
  });
};

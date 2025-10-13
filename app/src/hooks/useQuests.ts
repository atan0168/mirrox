import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuestRepository } from '../services/db/QuestRepository';

import type {
  QuestDef,
  QuestId,
  QuestProgress,
  Streak,
  CompletedLog,
  RewardTag,
} from '../models/quest';
import { localDayKeyUtc } from '../utils/datetimeUtils';
import { BADGES_KEY } from './useBadges';

export const QUEST_PROGRESS_KEY = ['quest-progress'] as const;
export const QUEST_STREAKS_KEY = ['quest-streaks'] as const;
export const QUEST_HISTORY_KEY = ['quest-history'] as const;
export const QUEST_POINTS_KEY = ['quest-points'] as const;

const getTodayDate = () => localDayKeyUtc(new Date());

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
        note: row.note ?? undefined,
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
      const res = await QuestRepository.completeQuestAtomic({
        questId: questDef.id,
        title: questDef.title,
        targetValue: questDef.target,
        rewardPoints: questDef.rewardPoints,
        rewardTag: questDef.rewardTag,
        note,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEST_STREAKS_KEY });
      queryClient.invalidateQueries({ queryKey: QUEST_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: QUEST_POINTS_KEY });
      queryClient.invalidateQueries({ queryKey: BADGES_KEY });
      queryClient.invalidateQueries({ queryKey: QUEST_PROGRESS_KEY });
    },
  });
};

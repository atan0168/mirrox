import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subDays, endOfDay } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useQuestHistory } from './useQuests';
import { useBadges } from './useBadges';
import { useAvatarStore } from '../store/avatarStore';
import type { BadgeId } from '../constants/badges';
import type { CompletedLog, QuestId, Streak } from '../models/quest';
import { QuestRepository } from '../services/db/QuestRepository';
import { AVAILABLE_ANIMATIONS } from '../constants';
import {
  CELEBRATION_FALLBACK_ANIMATION,
  CELEBRATION_ANIMATIONS_BY_BADGE,
} from '../constants/celebrations';
import { localDayString } from '../utils/datetimeUtils';

export type ShouldCelebrate = {
  drink7: boolean;
  mask7: boolean;
  walk7: boolean;
  breathe7: boolean;
  gratitude7: boolean;
};

export function useQuestCelebrations() {
  const queryClient = useQueryClient();
  const { history: questHistory } = useQuestHistory();
  const { earned: awardedBadges } = useBadges();

  const [activeCelebration, setActiveCelebration] = useState<BadgeId | null>(
    null
  );
  const [indicatorCelebration, setIndicatorCelebration] =
    useState<BadgeId | null>(null);
  const [dismissedCelebrations, setDismissedCelebrations] = useState<
    Set<BadgeId>
  >(() => new Set());

  const hasCurrentStreak = useCallback(
    (days: string[], streakLength: number): boolean => {
      if ((days?.length ?? 0) < streakLength) return false;

      const uniqSorted = Array.from(new Set(days)).sort();
      const today = localDayString(new Date());
      const yesterday = localDayString(subDays(new Date(), 1));

      const hasToday = uniqSorted.includes(today);
      const hasYesterday = uniqSorted.includes(yesterday);

      if (!hasToday && !hasYesterday) return false;

      const requiredDates: string[] = [];
      for (let i = 0; i < streakLength; i++) {
        const offset = hasToday ? i : i + 1;
        requiredDates.push(localDayString(subDays(new Date(), offset)));
      }

      return requiredDates.every(date => uniqSorted.includes(date));
    },
    []
  );

  const shouldCelebrate: ShouldCelebrate = useMemo(() => {
    if (!questHistory?.length) {
      return {
        drink7: false,
        mask7: false,
        walk7: false,
        breathe7: false,
        gratitude7: false,
      };
    }

    const badgeIds = new Set(awardedBadges?.map(b => b.id) ?? []);

    const map: Record<string, string[]> = {};
    questHistory.forEach(h => {
      const dayKey = localDayString(new Date(h.completedAt));
      if (!map[h.questId]) map[h.questId] = [];
      map[h.questId].push(dayKey);
    });

    return {
      drink7:
        !badgeIds.has('streak7_drink') &&
        hasCurrentStreak(map['drink_2l'] ?? [], 7),
      mask7:
        !badgeIds.has('streak7_mask') &&
        hasCurrentStreak(map['haze_mask_today'] ?? [], 7),
      walk7:
        !badgeIds.has('streak7_walk') &&
        hasCurrentStreak(map['nature_walk_10m'] ?? [], 7),
      breathe7:
        !badgeIds.has('streak7_breathe') &&
        hasCurrentStreak(map['calm_breath_5m'] ?? [], 7),
      gratitude7:
        !badgeIds.has('streak7_gratitude') &&
        hasCurrentStreak(map['gratitude_note'] ?? [], 7),
    };
  }, [questHistory, awardedBadges, hasCurrentStreak]);

  const availableCelebrations = useMemo(() => {
    const candidates: Array<[BadgeId, boolean]> = [
      ['streak7_drink', shouldCelebrate.drink7],
      ['streak7_mask', shouldCelebrate.mask7],
      ['streak7_walk', shouldCelebrate.walk7],
      ['streak7_breathe', shouldCelebrate.breathe7],
      ['streak7_gratitude', shouldCelebrate.gratitude7],
    ];

    return candidates
      .filter(([, eligible]) => eligible)
      .map(([id]) => id)
      .filter(id => !dismissedCelebrations.has(id));
  }, [shouldCelebrate, dismissedCelebrations]);

  const markCelebrationDismissed = useCallback((id: BadgeId) => {
    setDismissedCelebrations(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeCelebration) return;
    const next = availableCelebrations.length ? availableCelebrations[0] : null;
    setIndicatorCelebration(current => (current === next ? current : next));
  }, [availableCelebrations, activeCelebration]);

  // Animation switching and restore
  const activeAnimation = useAvatarStore(s => s.activeAnimation);
  const isManualAnimation = useAvatarStore(s => s.isManualAnimation);
  const setActiveAnimationStore = useAvatarStore(s => s.setActiveAnimation);
  const resetAvatarAnimations = useAvatarStore(s => s.resetAnimations);

  const resolveCelebrationAnimation = useCallback((badge: BadgeId | null) => {
    const availableNames = AVAILABLE_ANIMATIONS.map(anim => anim.name);
    if (!badge) return null;
    const preferred = CELEBRATION_ANIMATIONS_BY_BADGE[badge];
    if (preferred && availableNames.includes(preferred)) return preferred;
    return CELEBRATION_FALLBACK_ANIMATION;
  }, []);

  const previousAnimationRef = useRef<string | null>(null);
  const previousManualRef = useRef(false);

  useEffect(() => {
    const targetAnim = resolveCelebrationAnimation(activeCelebration);

    if (activeCelebration) {
      if (activeAnimation !== targetAnim) {
        if (previousAnimationRef.current === null) {
          previousAnimationRef.current = activeAnimation;
          previousManualRef.current = isManualAnimation;
        }
        setActiveAnimationStore(targetAnim, { manual: true });
      }
    } else {
      // Only restore if we are currently on a celebration animation
      const possibleCelebrations = new Set([
        CELEBRATION_FALLBACK_ANIMATION,
        ...Object.values(CELEBRATION_ANIMATIONS_BY_BADGE),
      ]);
      if (activeAnimation && possibleCelebrations.has(activeAnimation)) {
        const previous = previousAnimationRef.current;
        const wasManual = previousManualRef.current;

        if (previous) {
          setActiveAnimationStore(
            previous,
            wasManual ? { manual: true } : undefined
          );
        } else {
          resetAvatarAnimations();
        }

        previousAnimationRef.current = null;
        previousManualRef.current = false;
      }
    }
  }, [
    activeCelebration,
    activeAnimation,
    isManualAnimation,
    resetAvatarAnimations,
    setActiveAnimationStore,
    resolveCelebrationAnimation,
  ]);

  const handleOpenCelebration = useCallback(() => {
    if (!indicatorCelebration) return;
    setIndicatorCelebration(null);
    setActiveCelebration(indicatorCelebration);
  }, [indicatorCelebration]);

  const handleDismissCelebration = useCallback(() => {
    setActiveCelebration(current => {
      if (current) {
        markCelebrationDismissed(current);
      }
      return null;
    });
  }, [markCelebrationDismissed]);

  // DEV helper utilities colocated for now; will be extracted
  const updateHistoryCache = useCallback(
    (updater: (prev: CompletedLog[]) => CompletedLog[]) => {
      queryClient.setQueriesData(
        { queryKey: ['quest-history'] },
        (old: CompletedLog[] | undefined) => updater(old ?? [])
      );
    },
    [queryClient]
  );

  const updateStreakCache = useCallback(
    (questId: QuestId, count: number, lastDate: string) => {
      queryClient.setQueryData(
        ['quest-streaks'],
        (old: Record<QuestId, Streak> | undefined) => ({
          ...(old ?? ({} as Record<QuestId, Streak>)),
          [questId]: { id: questId, count, lastDate },
        })
      );
    },
    [queryClient]
  );

  const seed7DayHistory = useCallback(
    (questId: QuestId) => {
      const now = new Date();
      const logs: CompletedLog[] = Array.from({ length: 7 }).map((_, i) => {
        const d = endOfDay(subDays(now, 6 - i)).getTime();
        return {
          questId,
          title: questId,
          rewardPoints: 0,
          rewardTag: 'calm',
          completedAt: d,
          streakCount: i + 1,
          note: 'Dev Test Seed',
        } as CompletedLog;
      });

      updateHistoryCache(prev => [...logs, ...prev].slice(0, 50));
      // eslint-disable-next-line no-console
      console.log('✅ [DEV TEST] Seeded 7-day history for:', questId);
    },
    [updateHistoryCache]
  );

  const seed6ThenCompleteToday = useCallback(
    async (questId: QuestId) => {
      const now = new Date();
      const logs: CompletedLog[] = Array.from({ length: 6 }).map((_, i) => {
        const d = endOfDay(subDays(now, 6 - i)).getTime();
        return {
          questId,
          title: questId,
          rewardPoints: 0,
          rewardTag: 'calm',
          completedAt: d,
          streakCount: i + 1,
          note: 'DEV seed 6d',
        } as CompletedLog;
      });

      updateHistoryCache(prev => [...logs, ...prev].slice(0, 50));

      const yesterday = localDayString(subDays(now, 1));
      updateStreakCache(questId, 6, yesterday);
      try {
        await QuestRepository.upsertStreak(questId, 6, yesterday);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to seed quest streak for test', err);
      }

      // eslint-disable-next-line no-console
      console.log(
        '✅ Seeded 6 days for',
        questId,
        '— streak preset to 6 (lastDate=yesterday). Complete once today to award.'
      );
    },
    [updateHistoryCache, updateStreakCache]
  );

  const clearHistoryForRetest = useCallback(async () => {
    updateHistoryCache(() => []);
    setActiveCelebration(null);
    setIndicatorCelebration(null);
    setDismissedCelebrations(new Set<BadgeId>());

    try {
      const ALL_QUEST_IDS: QuestId[] = [
        'drink_2l',
        'haze_mask_today',
        'nature_walk_10m',
        'calm_breath_5m',
        'gratitude_note',
      ];
      const today = localDayString(new Date());
      await Promise.all(
        ALL_QUEST_IDS.map(id => QuestRepository.upsertStreak(id, 0, today))
      );
      queryClient.setQueryData(
        ['quest-streaks'],
        (old: Record<QuestId, Streak> | undefined) => {
          const next = { ...(old ?? ({} as Record<QuestId, Streak>)) };
          ALL_QUEST_IDS.forEach(id => {
            next[id] = { id, count: 0, lastDate: today };
          });
          return next;
        }
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to reset streaks during dev clear', err);
    }

    // eslint-disable-next-line no-console
    console.log('♻️ [DEV TEST] Cleared history for re-test');
  }, [updateHistoryCache, queryClient]);

  return {
    // state
    activeCelebration,
    indicatorCelebration,
    dismissedCelebrations,
    shouldCelebrate,
    availableCelebrations,

    // actions
    setActiveCelebration,
    setIndicatorCelebration,
    markCelebrationDismissed,
    handleOpenCelebration,
    handleDismissCelebration,

    // dev helpers (optionally used by dev UI)
    dev: {
      seed7DayHistory,
      seed6ThenCompleteToday,
      clearHistoryForRetest,
    },
  } as const;
}

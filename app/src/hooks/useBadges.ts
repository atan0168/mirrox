import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeRepository } from '../services/db/BadgeRepository';
import type { BadgeId } from '../constants/badges';

export type BadgeRecord = {
  id: BadgeId;
  earnedAt: string;
};

export const BADGES_KEY = ['badges'] as const;

export const useBadges = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BADGES_KEY,
    queryFn: async (): Promise<BadgeRecord[]> => {
      const rows = await BadgeRepository.getAll();
      return rows.map(row => ({
        id: row.id as BadgeId,
        earnedAt: new Date(row.awarded_at).toISOString(),
      }));
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const awardMutation = useMutation({
    mutationFn: async (badgeId: BadgeId): Promise<BadgeRecord> => {
      const earnedAt = new Date().toISOString();
      await BadgeRepository.award(badgeId);
      return { id: badgeId, earnedAt };
    },
    onSuccess: record => {
      queryClient.setQueryData(
        BADGES_KEY,
        (old: BadgeRecord[] = []): BadgeRecord[] => {
          if (old.some(b => b.id === record.id)) {
            return old;
          }
          return [record, ...old];
        }
      );
    },
  });

  const earned = query.data ?? [];

  const owned = useMemo(() => {
    return new Set<BadgeId>(earned.map(b => b.id));
  }, [earned]);

  return {
    earned,
    owned,
    isLoading: query.isLoading,
    error: query.error,
    has: (id: BadgeId) => owned.has(id),
    award: awardMutation.mutateAsync,
  };
};

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { useQuestHistory } from '../hooks/useQuests';
import type { CompletedLog } from '../models/quest';

const QUEST_TITLES: Record<string, string> = {
  drink_2l: 'Drink 2L Water',
  haze_mask_today: 'Wear Mask Today',
  nature_walk_10m: 'Nature Walk (10 min)',
  calm_breath_5m: 'Calm Breathing (5 min)',
  gratitude_note: 'Write a Gratitude Note',
};

const PAGE_SIZE = 20;

export default function QuestHistoryScreen() {
  const {
    history,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useQuestHistory(PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listEmptyMessage = error
    ? 'Unable to load quest history. Pull to retry.'
    : 'No completed quests yet. Finish one to see it here.';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.neutral[50],
        padding: spacing.lg,
      }}
    >
      <Text
        style={{
          fontWeight: '700',
          fontSize: fontSize.xl,
          color: colors.neutral[900],
          marginBottom: spacing.md,
        }}
      >
        Quest History
      </Text>

      <FlatList
        data={history}
        keyExtractor={(item, idx) =>
          `${item.questId}-${item.completedAt}-${idx}`
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading || (isFetching && !isFetchingNextPage)}
            onRefresh={onRefresh}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        renderItem={({ item }: { item: CompletedLog }) => {
          const title =
            item.title?.trim() || QUEST_TITLES[item.questId] || item.questId;
          const displayTime = format(
            new Date(item.completedAt),
            'yyyy-MM-dd HH:mm'
          );

          return (
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.divider,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontWeight: '600',
                  fontSize: fontSize.base,
                  color: colors.neutral[900],
                }}
              >
                {title}
              </Text>

              <Text
                style={{
                  marginTop: spacing.xs,
                  fontSize: fontSize.sm,
                  color: colors.neutral[600],
                }}
              >
                {displayTime}
              </Text>

              {item.rewardPoints > 0 && item.rewardTag && (
                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontSize: fontSize.sm,
                    color: colors.neutral[800],
                  }}
                >
                  Reward: +{item.rewardPoints} ({item.rewardTag})
                </Text>
              )}

              {!!item.note && (
                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontSize: fontSize.sm,
                    fontStyle: 'italic',
                    color: colors.neutral[700],
                  }}
                >
                  “{item.note}”
                </Text>
              )}

              {typeof item.streakCount === 'number' && (
                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontSize: fontSize.xs,
                    color: colors.neutral[500],
                  }}
                >
                  Streak: {item.streakCount} day(s)
                </Text>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View
              style={{
                paddingVertical: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={colors.neutral[500]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={{ color: colors.neutral[600] }}>
            {isLoading ? 'Loading quest history...' : listEmptyMessage}
          </Text>
        }
      />
    </View>
  );
}

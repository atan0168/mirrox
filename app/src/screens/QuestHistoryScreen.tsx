import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { localStorageService } from '../services/LocalStorageService';

/** Local, persistent history record (no user identifiers). */
type PersistedHistoryItem = {
  questId: string;
  date: string; // 'YYYY-MM-DD'
  timestamp: number; // epoch millis
  title?: string;
  rewardPoints?: number;
  rewardTag?: string;
  note?: string;
  streakCount?: number;
};

/** Optional title mapping for nicer display. */
const QUEST_TITLES: Record<string, string> = {
  drink_2l: 'Drink 2L Water',
  haze_mask_today: 'Wear Mask Today',
  nature_walk_10m: 'Nature Walk (10 min)',
  calm_breath_5m: 'Calm Breathing (5 min)',
  gratitude_note: 'Write a Gratitude Note',
};

export default function QuestHistoryScreen() {
  const [history, setHistory] = useState<PersistedHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load persistent history from storage (newest first)
  const loadHistory = useCallback(async () => {
    try {
      const raw = await localStorageService.getString('questHistory');
      const arr: PersistedHistoryItem[] = raw ? JSON.parse(raw) : [];
      arr.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      setHistory(arr);
    } catch (e) {
      console.warn('Failed to load questHistory:', e);
      setHistory([]);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Also reload whenever the screen gains focus (navigate back here)
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

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
        keyExtractor={(item, idx) => `${item.questId}-${item.timestamp}-${idx}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const title =
            item.title || QUEST_TITLES[item.questId] || item.questId;
          const displayTime = item.timestamp
            ? format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm')
            : item.date || '-';

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

              {typeof item.rewardPoints === 'number' && item.rewardTag && (
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
        ListEmptyComponent={
          <Text style={{ color: colors.neutral[600] }}>
            No completed quests yet. Finish one to see it here.
          </Text>
        }
      />
    </View>
  );
}

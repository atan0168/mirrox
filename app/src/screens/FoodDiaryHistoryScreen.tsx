import { useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { useMealHistory } from '../hooks/useMealHistory';
import type { RootStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize, spacing } from '../theme';

type HistoryNav = StackNavigationProp<RootStackParamList, 'FoodDiaryHistory'>;

export default function FoodDiaryHistoryScreen() {
  const navigation = useNavigation<HistoryNav>();
  const { data, isLoading, isRefetching, refetch } = useMealHistory();

  const historyItems = useMemo(() => data ?? [], [data]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof historyItems)[number] }) => {
      const dateLabel = format(new Date(item.startedAt), 'EEE, dd MMM yyyy');
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('FoodDiaryHistoryDetail', {
              mealId: item.id,
              dateLabel,
              totalEnergyKcal: item.totalEnergyKcal,
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{dateLabel}</Text>
            <Text style={styles.energyText}>{item.totalEnergyKcal} kcal</Text>
          </View>
          <Text style={styles.metaText}>
            {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      );
    },
    [historyItems, navigation]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingLabel}>Loading history...</Text>
      </View>
    );
  }

  if (!historyItems.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyLabel}>
          No meal history yet. Start tracking your meals to see them here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={historyItems}
      keyExtractor={item => `${item.id}`}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
  },
  loadingLabel: {
    marginTop: spacing.sm,
    color: colors.neutral[500],
    fontSize: fontSize.base,
  },
  emptyLabel: {
    color: colors.neutral[500],
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.neutral[50],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  energyText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  metaText: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
  },
  separator: {
    height: spacing.xs,
  },
});

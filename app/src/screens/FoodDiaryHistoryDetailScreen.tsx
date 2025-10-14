import { useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useMealItemsById } from '../hooks/useMealItemsById';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import {
  getMealItemModifiers,
  getMealItemNutrientTotal,
  getMealItemPortionText,
  resolveMealItemName,
  buildMealAnalysisFromItems,
} from '../utils/nutritionUtils';
import type { RootStackParamList } from '../navigation/types';

type HistoryDetailRoute = RouteProp<
  RootStackParamList,
  'FoodDiaryHistoryDetail'
>;

const round0 = (v?: number | null) =>
  v == null || Number.isNaN(v) ? 'N/A' : String(Math.round(v));

const fmt1 = (v?: number | null) =>
  v == null || Number.isNaN(v) ? 'N/A' : (Math.round(v * 10) / 10).toFixed(1);

const displayValue = (
  v?: number | null,
  unit?: string,
  decimals: '0' | '1' = '1'
) => {
  const raw = decimals === '0' ? round0(v) : fmt1(v);
  if (raw === 'N/A') {
    return raw;
  }
  return unit ? `${raw} ${unit}` : raw;
};

export default function FoodDiaryHistoryDetailScreen() {
  const route = useRoute<HistoryDetailRoute>();
  const { mealId, dateLabel, totalEnergyKcal } = route.params;
  const {
    data: mealItems = [],
    isLoading,
    isRefetching,
    refetch,
  } = useMealItemsById(mealId);

  const derivedAnalysis = useMemo(
    () => buildMealAnalysisFromItems(mealItems),
    [mealItems]
  );

  const totals = derivedAnalysis?.nutrients?.total;
  const totalEnergy = totals?.energy_kcal ?? totalEnergyKcal;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingLabel}>Loading meal...</Text>
      </View>
    );
  }

  if (!mealItems.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyLabel}>
          No food items were logged for this day.
        </Text>
      </View>
    );
  }

  const breakdownRows = [
    {
      key: 'energy_kcal',
      label: 'Energy',
      value: displayValue(totalEnergy, 'kcal', '0'),
    },
    {
      key: 'sugar_g',
      label: 'Sugar',
      value: displayValue(totals?.sugar_g, 'g'),
    },
    {
      key: 'fat_g',
      label: 'Fat',
      value: displayValue(totals?.fat_g, 'g'),
    },
    {
      key: 'sat_fat_g',
      label: 'Saturated Fat',
      value: displayValue(totals?.sat_fat_g, 'g'),
    },
    {
      key: 'protein_g',
      label: 'Protein',
      value: displayValue(totals?.protein_g, 'g'),
    },
    {
      key: 'fiber_g',
      label: 'Fiber',
      value: displayValue(totals?.fiber_g, 'g'),
    },
    {
      key: 'sodium_mg',
      label: 'Sodium',
      value: displayValue(totals?.sodium_mg, 'mg', '0'),
    },
  ].filter(row => row.value !== 'N/A');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>{dateLabel}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Totals</Text>
        {breakdownRows.length ? (
          breakdownRows.map(row => (
            <View key={row.key} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptySummary}>
            No nutrient details available.
          </Text>
        )}
      </View>

      <View style={styles.itemsCard}>
        <Text style={styles.itemsTitle}>Food Items</Text>
        {mealItems.map(item => {
          const name = resolveMealItemName(item);
          const portion = getMealItemPortionText(item);
          const modifiers = getMealItemModifiers(item);
          const energy = displayValue(
            getMealItemNutrientTotal(item, 'energy_kcal'),
            'kcal',
            '0'
          );
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemTextWrapper}>
                <Text style={styles.itemName}>{name}</Text>
                {portion ? (
                  <Text style={styles.itemMeta}>{portion}</Text>
                ) : null}
                {modifiers.length ? (
                  <Text style={styles.itemMeta}>{modifiers.join(', ')}</Text>
                ) : null}
              </View>
              <Text style={styles.itemEnergy}>{energy}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
  container: {
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    gap: spacing.md,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.neutral[900],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
  },
  summaryValue: {
    color: colors.neutral[900],
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  emptySummary: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
  },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: spacing.sm,
  },
  itemsTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  itemTextWrapper: {
    flex: 1,
    paddingRight: spacing.md,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  itemMeta: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    marginTop: spacing.xs / 2,
  },
  itemEnergy: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});

import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InfoPopover from '../components/InfoPopover';
import { useMeal } from '../hooks/useMeal';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';
import {
  buildMealAnalysisFromItems,
  getMealItemModifiers,
  getMealItemNutrientTotal,
  getMealItemPortionText,
  getMealItemSource,
  resolveMealItemName,
  resolveSourceLabel,
} from '../utils/nutritionUtils';

const BADGE_MAPPING: Record<string, { bg: string; fg: string; label: string }> =
  {
    usda: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'USDA' },
    myfcd: { bg: '#CCFBF1', fg: '#0F766E', label: 'MyFCD' },
    local: { bg: '#FEF3C7', fg: '#B45309', label: 'curated' },
  };

function SourceBadge({
  source,
  label,
}: {
  source?: string;
  label?: string | null;
}) {
  if (!source && !label) {
    return null;
  }

  const key = (source || 'local').toLowerCase();
  const s = BADGE_MAPPING[key] || BADGE_MAPPING.local;

  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
      }}
    >
      <Text style={{ color: s.fg, fontWeight: '700', fontSize: 12 }}>
        {label?.trim() || s.label}
      </Text>
    </View>
  );
}

export default function NutritionDetailScreen() {
  const { data: mealItems = [], analysis } = useMeal();
  const [showHow, setShowHow] = useState(false);

  const derivedAnalysis = useMemo(
    () => buildMealAnalysisFromItems(mealItems, analysis ?? undefined),
    [mealItems, analysis]
  );

  const totals = derivedAnalysis?.nutrients?.total;
  const sources = derivedAnalysis?.sources ?? analysis?.sources ?? [];
  const tips = derivedAnalysis?.tips ?? [];

  // Number helpers
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

  const breakdownRows = [
    {
      key: 'sugar_g',
      label: 'Sugar',
      value: displayValue(totals?.sugar_g, 'g'),
    },
    { key: 'fat_g', label: 'Fat', value: displayValue(totals?.fat_g, 'g') },
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

  const energyDisplay = displayValue(totals?.energy_kcal, 'kcal', '0');

  if (mealItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          No meal items yet. Please analyze or add foods first.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.h1}>Meal Nutrition</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.h2}>Summary</Text>
          <Pressable style={styles.helpBtn} onPress={() => setShowHow(true)}>
            <Text style={styles.helpBtnText}>?</Text>
          </Pressable>
        </View>

        <Text style={styles.energyValue}>{energyDisplay}</Text>
        <Text style={styles.energyLabel}>Total energy</Text>

        {breakdownRows.length ? (
          <View style={styles.breakdownGrid}>
            {breakdownRows.map(row => (
              <View key={row.key} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{row.label}</Text>
                <Text style={styles.breakdownValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.muted, styles.breakdownEmpty]}>
            No breakdown data.
          </Text>
        )}
      </View>

      {/* ===== Items card ===== */}
      <View style={styles.card}>
        <Text style={styles.h2}>Items</Text>
        {mealItems.length === 0 ? (
          <Text style={styles.muted}>No items detected.</Text>
        ) : (
          mealItems.map((item, idx) => {
            const label = resolveMealItemName(item);
            const portion = getMealItemPortionText(item);
            const modifiers = getMealItemModifiers(item);
            const modifierText = modifiers.length ? modifiers.join(', ') : null;
            const sourceKey = getMealItemSource(item);
            const sourceLabel = resolveSourceLabel(sourceKey, sources);
            const nutrientMetrics = [
              {
                key: 'energy_kcal',
                label: 'Energy',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'energy_kcal'),
                  'kcal',
                  '0'
                ),
              },
              {
                key: 'sugar_g',
                label: 'Sugar',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'sugar_g'),
                  'g'
                ),
              },
              {
                key: 'fat_g',
                label: 'Fat',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'fat_g'),
                  'g'
                ),
              },
              {
                key: 'sat_fat_g',
                label: 'Sat Fat',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'sat_fat_g'),
                  'g'
                ),
              },
              {
                key: 'protein_g',
                label: 'Protein',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'protein_g'),
                  'g'
                ),
              },
              {
                key: 'fiber_g',
                label: 'Fiber',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'fiber_g'),
                  'g'
                ),
              },
              {
                key: 'sodium_mg',
                label: 'Sodium',
                value: displayValue(
                  getMealItemNutrientTotal(item, 'sodium_mg'),
                  'mg',
                  '0'
                ),
              },
            ].filter(entry => entry.value !== 'N/A');

            return (
              <View key={item.id ?? idx} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{label}</Text>
                  <SourceBadge
                    source={sourceKey ?? undefined}
                    label={sourceLabel}
                  />
                </View>
                {portion && (
                  <Text style={styles.itemMeta}>Portion: {portion}</Text>
                )}
                {modifierText && (
                  <Text style={styles.itemMeta}>Notes: {modifierText}</Text>
                )}
                {!!nutrientMetrics.length && (
                  <View style={styles.itemMetrics}>
                    {nutrientMetrics.map(metric => (
                      <Text key={metric.key} style={styles.itemMetric}>
                        {metric.label} · {metric.value}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* ===== Suggestions ===== */}
      {!!tips.length && (
        <View style={styles.card}>
          <Text style={styles.h2}>Suggestions</Text>
          {tips.slice(0, 5).map((t, i) => (
            <Text key={i} style={styles.tip}>
              • {t}
            </Text>
          ))}
        </View>
      )}

      <InfoPopover
        visible={showHow}
        onClose={() => setShowHow(false)}
        title="How it’s calculated"
      >
        <Text style={styles.popText}>
          • Nutrition data comes from{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://myfcd.moh.gov.my/')}
          >
            Malaysia Food Composition Database (MyFCD)
          </Text>
          , with curated local dishes.{'\n'}• We add up the nutrients of all
          items in your meal to estimate totals.{'\n'}• Tags follow thresholds
          from{' '}
          <Text
            style={styles.link}
            onPress={() =>
              Linking.openURL('https://www.who.int/health-topics/nutrition')
            }
          >
            WHO
          </Text>{' '}
          and{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://nutrition.moh.gov.my/')}
          >
            Malaysia RNI
          </Text>
          .{'\n'}• Estimates are for awareness only, not medical advice.
        </Text>
      </InfoPopover>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  h1: { fontSize: fontSize.xxl, fontWeight: '700', marginBottom: spacing.sm },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },

  h2: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xs },
  h3: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  energyValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
    color: colors.neutral[900],
  },
  energyLabel: {
    color: colors.neutral[500],
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  breakdownItem: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    color: colors.neutral[500],
    fontSize: fontSize.xs,
  },
  breakdownValue: {
    color: colors.neutral[900],
    fontWeight: '600',
    marginTop: 2,
  },
  breakdownEmpty: { marginBottom: spacing.sm },

  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: { fontSize: fontSize.xs },

  muted: { color: colors.neutral[500] },
  itemBlock: { marginBottom: spacing.md },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemName: { fontWeight: '600', color: colors.neutral[900] },
  itemMeta: { color: colors.neutral[500], marginBottom: spacing.xs },
  itemMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  itemMetric: {
    color: colors.primary,
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  tip: { marginTop: spacing.xs, color: colors.primary },

  helpBtn: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sky[50],
    borderWidth: 1,
    borderColor: colors.sky[200],
  },
  helpBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.sky[700],
    marginTop: -1,
  },

  popText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.neutral[900],
  },

  link: {
    color: colors.sky[600],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

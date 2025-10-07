import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InfoPopover from '../components/InfoPopover';
import { TAG_LABEL } from '../constants';
import { useMealStore } from '../store/mealStore';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';

const BADGE_MAPPING: Record<string, { bg: string; fg: string; label: string }> =
  {
    usda: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'USDA' },
    myfcd: { bg: '#CCFBF1', fg: '#0F766E', label: 'MyFCD' },
    local: { bg: '#FEF3C7', fg: '#B45309', label: 'curated' },
  };

function SourceBadge({ source }: { source?: string }) {
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
        {s.label}
      </Text>
    </View>
  );
}

export default function NutritionDetailScreen() {
  const last = useMealStore(s => s.lastAnalysis);
  const [showHow, setShowHow] = useState(false);

  // Empty state: nothing analyzed yet
  if (!last) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          No analysis available. Please analyze a meal first.
        </Text>
      </View>
    );
  }

  // Totals and per-item list
  const total = last.nutrients?.total || {};
  const items = last.nutrients?.per_item ?? [];

  // Number helpers
  const round0 = (v?: number) =>
    v == null || Number.isNaN(v) ? 'N/A' : String(Math.round(v));
  const fmt1 = (v?: number) =>
    v == null || Number.isNaN(v) ? 'N/A' : (Math.round(v * 10) / 10).toFixed(1);

  // Prefer display labels if provided by backend
  const tagDisplay: string[] = (last.tags ?? []).map(k => TAG_LABEL[k] || k);

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

        <View style={styles.row}>
          <Text style={styles.key}>Energy</Text>
          <Text style={styles.val}>{round0(total.energy_kcal)} kcal</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Sugar</Text>
          <Text style={styles.val}>{fmt1(total.sugar_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Fat</Text>
          <Text style={styles.val}>{fmt1(total.fat_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Saturated Fat</Text>
          <Text style={styles.val}>{fmt1(total.sat_fat_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Protein</Text>
          <Text style={styles.val}>{fmt1(total.protein_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Fiber</Text>
          <Text style={styles.val}>{fmt1(total.fiber_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Sodium</Text>
          <Text style={styles.val}>{round0(total.sodium_mg)} mg</Text>
        </View>

        <Text style={styles.h3}>Tags</Text>
        <View style={styles.tags}>
          {tagDisplay.length ? (
            tagDisplay.map((t, i) => (
              <View key={`${t}-${i}`} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No tags</Text>
          )}
        </View>
      </View>

      {/* ===== Items card ===== */}
      <View style={styles.card}>
        <Text style={styles.h2}>Items</Text>
        {items.length === 0 ? (
          <Text style={styles.muted}>No items detected.</Text>
        ) : (
          items.map((it, idx: number) => {
            const label =
              it.display_name || it.name || it.id || `Item ${idx + 1}`;

            return (
              <View key={idx} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text style={styles.itemName}>{label}</Text>
                  <SourceBadge source={it.source} />
                </View>
                <Text style={styles.itemLine}>
                  Energy: {round0(it.energy_kcal)} kcal
                </Text>
                <Text style={styles.itemLine}>
                  Sugar: {fmt1(it.sugar_g)} g; Fat: {fmt1(it.fat_g)} g; Sat Fat:{' '}
                  {fmt1(it.sat_fat_g)} g
                </Text>
                <Text style={styles.itemLine}>
                  Protein: {fmt1(it.protein_g)} g; Fiber: {fmt1(it.fiber_g)} g;
                  Sodium: {round0(it.sodium_mg)} mg
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* ===== Suggestions ===== */}
      {!!(last.tips || []).length && (
        <View style={styles.card}>
          <Text style={styles.h2}>Suggestions</Text>
          {last.tips!.slice(0, 5).map((t, i) => (
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

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  key: { color: colors.neutral[500] },
  val: { fontWeight: '600' },

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
  itemName: { fontWeight: '600' },
  itemLine: { color: colors.primary, marginTop: spacing.xs },
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

// app/src/screens/NutritionDetailScreen.tsx
import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
} from 'react-native';
import { useMealStore } from '../store/mealStore';
import InfoPopover from '../components/InfoPopover';

// Fallback labels if tags_display is not provided by backend
const TAG_LABEL: Record<string, string> = {
  high_sugar: 'High Sugar',
  high_fat: 'High Fat',
  low_fiber: 'Low Fiber',
  high_sodium: 'High Sodium',
  unbalanced: 'Unbalanced',
};

// Small badge for per-item data source
function SourceBadge({ source }: { source?: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    usda: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'USDA' },
    myfcd: { bg: '#CCFBF1', fg: '#0F766E', label: 'MyFCD' },
    local: { bg: '#FEF3C7', fg: '#B45309', label: 'curated' },
  };
  const key = (source || 'local').toLowerCase();
  const s = map[key] || map.local;

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
  const items: any[] = last.nutrients?.per_item ?? (last as any).per_item ?? [];

  // Optional canonical naming map
  const nameMap: Record<string, string> = Object.fromEntries(
    (last as any)?.canonical?.map?.((c: any) => [
      c.id,
      c.display_name || c.name || c.id,
    ]) ?? []
  );

  // Number helpers
  const round0 = (v?: number) =>
    v == null || Number.isNaN(v) ? 'N/A' : String(Math.round(v));
  const fmt1 = (v?: number) =>
    v == null || Number.isNaN(v) ? 'N/A' : (Math.round(v * 10) / 10).toFixed(1);

  // Prefer display labels if provided by backend
  const tagDisplay: string[] = (last as any)?.tags_display?.length
    ? (last as any).tags_display
    : (last.tags ?? []).map(k => TAG_LABEL[k] || k);

  return (
    <ScrollView
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.h1}>Meal Nutrition</Text>

      {/* ===== Summary card ===== */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.h2}>Summary</Text>
          {/* Help icon (opens methodology popover) */}
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
          <Text style={styles.val}>{fmt1((total as any).sat_fat_g)} g</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Protein</Text>
          <Text style={styles.val}>{fmt1((total as any).protein_g)} g</Text>
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
          items.map((it: any, idx: number) => {
            const label =
              it.display_name ||
              nameMap[it.id] ||
              it.name ||
              it.id ||
              `Item ${idx + 1}`;

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

      {/* ===== Popover: How it's calculated (with official links) ===== */}
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
  container: { padding: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },

  h2: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  h3: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  key: { color: '#6B7280' },
  val: { fontWeight: '600' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 12 },

  muted: { color: '#6B7280' },
  itemName: { fontWeight: '600' },
  itemLine: { color: '#374151', marginTop: 2 },
  tip: { marginTop: 4, color: '#374151' },

  // Help icon button in Summary card
  helpBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  helpBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
    marginTop: -1,
  },

  // Popover text
  popText: { fontSize: 14, lineHeight: 20, color: '#111827' },

  // Link style inside popover
  link: {
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

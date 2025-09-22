// app/src/components/AnalysisCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

type Props = {
  energyKcal?: number | null;
  tags?: string[];
  onPressDetails?: () => void;
};

const TAG_LABEL: Record<string, string> = {
  high_sugar: 'High Sugar',
  high_fat: 'High Fat',
  low_fiber: 'Low Fiber',
  high_sodium: 'High Sodium',
  unbalanced: 'Unbalanced',
};

export default function AnalysisCard({
  energyKcal,
  tags = [],
  onPressDetails,
}: Props) {
  const displayTags = tags.map(k => TAG_LABEL[k] ?? k).filter(Boolean);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Analysis Preview</Text>

      {typeof energyKcal === 'number' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Energy</Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'baseline',
            }}
          >
            <Text style={styles.energyValue}>{Math.round(energyKcal)}</Text>
            <Text style={styles.energyUnit}>kcal</Text>
          </View>
        </View>
      )}

      {displayTags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.chipWrap}>
            {displayTags.map(t => (
              <View key={t} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {onPressDetails && (
        <Pressable onPress={onPressDetails} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>View full analysis</Text>
          <Text style={styles.ghostButtonArrow}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.06)',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  section: { marginTop: 8, alignItems: 'center' },
  sectionLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  energyValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  energyUnit: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: Platform.select({ ios: '600', android: '600' }),
    color: '#111827',
  },
  ghostButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FAFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  ghostButtonArrow: { fontSize: 15, marginLeft: 6, color: '#2563EB' },
});

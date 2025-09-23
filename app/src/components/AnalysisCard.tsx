// app/src/components/AnalysisCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

// Use UI defaults from theme
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';

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

      {/* Energy section */}
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

      {/* Tags section */}
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

      {/* CTA */}
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
  // Card container
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl, // 16
    paddingVertical: spacing.md, // 16
    paddingHorizontal: spacing.lg, // 24
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    ...shadows.soft, // subtle elevation
  },

  // Title
  title: {
    fontSize: fontSize.lg, // 18
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md, // 16
  },

  // Generic section wrapper
  section: {
    marginTop: spacing.sm, // 8
    alignItems: 'center',
  },
  // Section label (caption)
  sectionLabel: {
    fontSize: fontSize.xs, // 12
    color: colors.neutral[600],
    marginBottom: spacing.xs, // 4
  },

  // Energy value and unit
  energyValue: {
    fontSize: fontSize.xxxl, // 32 (closest token to prior 28)
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  energyUnit: {
    marginLeft: spacing.xs, // 4
    fontSize: fontSize.sm, // 14
    color: colors.neutral[600],
    fontWeight: Platform.select({ ios: '600', android: '600' }),
  },

  // Tag chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xs, // 4
  },
  chip: {
    paddingHorizontal: spacing.md, // 16
    paddingVertical: spacing.xs, // 4
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.divider,
    marginHorizontal: spacing.xs, // 4
    marginVertical: spacing.xs, // 4
  },
  chipText: {
    fontSize: fontSize.sm, // 14 (closest to prior 13)
    fontWeight: Platform.select({ ios: '600', android: '600' }),
    color: colors.neutral[700],
  },

  // Ghost button (link-like CTA)
  ghostButton: {
    marginTop: spacing.md, // 16
    paddingVertical: spacing.sm, // 8
    paddingHorizontal: spacing.md, // 16
    borderRadius: borderRadius.lg, // 12
    borderWidth: 1,
    backgroundColor: colors.sky[50],
    borderColor: colors.sky[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: fontSize.sm, // 14
    fontWeight: '700',
    color: colors.sky[600],
  },
  ghostButtonArrow: {
    fontSize: fontSize.lg, // 18
    marginLeft: spacing.xs, // 4
    color: colors.sky[600],
  },
});

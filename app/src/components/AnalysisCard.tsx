import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';
import { TAG_LABEL } from '../constants';

type Props = {
  energyKcal?: number | null;
  tags?: string[];
  onPressDetails?: () => void;
};

export default function AnalysisCard({
  energyKcal,
  tags = [],
  onPressDetails,
}: Props) {
  const displayTags = tags.map(k => TAG_LABEL[k] ?? k).filter(Boolean);
  const detailsDisabled = !onPressDetails;

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
        <Pressable
          onPress={onPressDetails}
          style={styles.ghostButton}
          disabled={detailsDisabled}
        >
          <Text style={styles.ghostButtonText}>View full analysis</Text>
          <ChevronRight size={18} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    ...shadows.soft,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  energyValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  energyUnit: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.divider,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  ghostButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.sky[50],
    borderColor: colors.sky[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.sky[600],
  },
  ghostButtonArrow: {
    fontSize: fontSize.lg,
    marginLeft: spacing.xs,
    color: colors.sky[600],
  },
});

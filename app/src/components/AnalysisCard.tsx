import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card, Button, Badge } from './ui';
import { colors, spacing, fontSize } from '../theme';
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
    <Card style={styles.card} padding="lg">
      <Text style={styles.title}>Analysis Preview</Text>

      {/* Energy section */}
      {typeof energyKcal === 'number' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Energy</Text>
          <View style={styles.energyRow}>
            <Text style={styles.energyValue}>{Math.round(energyKcal)}</Text>
            <Text style={styles.energyUnit}>kcal</Text>
          </View>
        </View>
      )}

      {/* Tags section */}
      {displayTags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tags}>
            {displayTags.map(t => (
              <Badge
                key={t}
                variant="outline"
                size="sm"
                style={styles.tagBadge}
                textStyle={styles.tagText}
              >
                {t}
              </Badge>
            ))}
          </View>
        </View>
      )}

      {/* CTA */}
      {onPressDetails && (
        <Button
          onPress={onPressDetails}
          variant="ghost"
          size="sm"
          style={styles.detailsButton}
          disabled={detailsDisabled}
        >
          <View style={styles.detailsContent}>
            <Text style={styles.detailsLabel}>View full analysis</Text>
            <ChevronRight size={18} strokeWidth={2} />
          </View>
        </Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
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
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  tagBadge: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
    alignSelf: 'auto',
  },
  tagText: {
    fontWeight: '600',
    color: colors.neutral[700],
  },
  detailsButton: {
    marginTop: spacing.md,
  },
  detailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
});

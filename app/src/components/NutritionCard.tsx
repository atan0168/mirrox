import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { TAG_LABEL } from '../constants';
import { Card, Button, Badge } from './ui';
import { colors, spacing, fontSize } from '../theme';

type NutritionCardProps = {
  total?: {
    energy_kcal?: number;
    sugar_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
  };
  tags?: string[];
  sources?: { key: string; label: string; url?: string }[];
  onPressDetails?: () => void;
};

export function NutritionCard({
  total,
  tags,
  sources,
  onPressDetails,
}: NutritionCardProps) {
  const topTags = (tags ?? []).slice(0, 2);
  const primarySource = sources?.[0]?.label;

  const detailsDisabled = !onPressDetails;

  return (
    <Card style={styles.card} padding="md">
      <Text style={styles.title}>Nutrition</Text>

      {!total ? (
        <Text style={styles.emptyState}>No meals analyzed yet</Text>
      ) : (
        <>
          <Text style={styles.metricText}>
            Energy: {Math.round(total.energy_kcal || 0)} kcal
          </Text>

          {!!topTags.length && (
            <View style={styles.tagsContainer}>
              {topTags.map(tag => (
                <Badge key={tag} variant="outline" size="sm" style={styles.tag}>
                  {TAG_LABEL[tag] || tag}
                </Badge>
              ))}
            </View>
          )}

          {primarySource && (
            <Text style={styles.sourceText}>Source: {primarySource}</Text>
          )}

          <Button
            variant="ghost"
            size="sm"
            onPress={onPressDetails}
            disabled={detailsDisabled}
            accessibilityRole="button"
            accessibilityLabel="See nutrition details"
            style={styles.detailsButton}
          >
            <View style={styles.detailsContent}>
              <Text style={styles.detailsLabel}>See details</Text>
              <ChevronRight size={18} color={colors.sky[600]} strokeWidth={2} />
            </View>
          </Button>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xxl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  emptyState: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  metricText: {
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    color: colors.neutral[800],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tag: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  sourceText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  detailsButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  detailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sky[600],
    marginRight: spacing.xs,
  },
});

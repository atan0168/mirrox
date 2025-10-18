import { FC } from 'react';
import { NutritionRecommendationsResult } from '../../types/nutrition';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../theme';

interface RecommendationListProps {
  nutritionRecommendations: NutritionRecommendationsResult;
  selectedNutritionAspectId: string | null;
}
export const RecommendationList: FC<RecommendationListProps> = ({
  nutritionRecommendations,
  selectedNutritionAspectId,
}) => {
  const selected = nutritionRecommendations.aspects.find(
    x => x.id === selectedNutritionAspectId
  );
  if (!selected) {
    return (
      <View style={styles.recommendationList}>
        {nutritionRecommendations.aspects.map(a => (
          <View key={a.id} style={{ marginBottom: spacing.sm }}>
            <Text style={{ fontWeight: '700' }}>{a.title}</Text>
            <Text style={styles.recommendationItem}>• {a.detail}</Text>
            {a.tips.map((t: string, i: number) => (
              <Text key={i} style={styles.recommendationItem}>
                - {t}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.recommendationList}>
      <Text style={{ fontWeight: '700' }}>{selected.title}</Text>
      <Text style={styles.recommendationItem}>{selected.detail}</Text>
      {selected.tips.map((t: string, i: number) => (
        <Text key={i} style={styles.recommendationItem}>
          • {t}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  recommendationList: {
    paddingVertical: spacing.sm,
  },
  recommendationItem: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
});

import React from 'react';
import { View, Text } from 'react-native';
import InfoTable from '../components/ui/InfoTable';
import { colors, fontSize, spacing } from '../theme';

export const getSkinGlowTooltipContent = () => {
  const sleepTiers = [
    {
      label: 'Excellent Sleep',
      value: '+30 points',
      description: '8+ hours of quality sleep',
    },
    {
      label: 'Good Sleep',
      value: '+20 points',
      description: '7+ hours of sleep',
    },
    {
      label: 'Fair Sleep',
      value: '+10 points',
      description: '6+ hours of sleep',
    },
  ];

  const commuteTiers = [
    {
      label: 'Walking/Biking',
      value: '+10 points',
      description: 'Active commute methods',
    },
    {
      label: 'Work from Home',
      value: '+8 points',
      description: 'No commute stress',
    },
    {
      label: 'Public Transit',
      value: '+5 points',
      description: 'Less stressful than driving',
    },
    {
      label: 'Driving',
      value: '-5 points',
      description: 'Stress and pollution exposure',
    },
  ];

  return (
    <View>
      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.neutral[700],
          lineHeight: 22,
          marginBottom: spacing.md,
        }}
      >
        Skin glow combines sleep quality and commute method to reflect your
        overall wellness and stress levels.
      </Text>

      <InfoTable title="Sleep Quality Impact" rows={sleepTiers} />

      <InfoTable title="Commute Method Impact" rows={commuteTiers} />

      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.neutral[600],
          lineHeight: 20,
          marginTop: spacing.md,
          fontStyle: 'italic',
        }}
      >
        Your final score is calculated by combining both factors, with sleep
        having a stronger influence on your skin health.
      </Text>
    </View>
  );
};

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import ProgressRow from './ProgressRow';
import { colors, spacing, fontSize } from '../../theme';
import { UserProfile } from '../../models/User';
import { AirQualityData } from '../../models/AirQuality';
import {
  deriveEnergy,
  deriveLung,
  deriveSkinGlow,
  getEnergyExplanation,
  getLungExplanation,
  getSkinGlowExplanation,
} from '../../utils/healthMetrics';
import { getSkinGlowTooltipContent } from '../../utils/tooltipContent';
// getEnergyExplanation now returns a React node

interface HealthSummaryProps {
  userProfile?: UserProfile;
  airQuality?: AirQualityData;
}

const HealthSummary: React.FC<HealthSummaryProps> = ({
  userProfile,
  airQuality,
}) => {
  const energy = deriveEnergy(userProfile?.sleepHours);
  const lung = deriveLung(airQuality?.aqi);
  const skin = deriveSkinGlow(
    userProfile?.sleepHours,
    userProfile?.commuteMode
  );

  const tooltips = {
    energy: getEnergyExplanation(userProfile?.sleepHours),
    lung: getLungExplanation(airQuality?.aqi),
    skin: getSkinGlowTooltipContent(),
  };

  return (
    <View style={styles.container}>
      <Card variant="ghost">
        <Text style={styles.title}>Health Summary</Text>
        <ProgressRow
          label="Energy"
          value={energy}
          tooltipContent={tooltips.energy}
        />
        <ProgressRow
          label="Lung Health"
          value={lung}
          tooltipContent={tooltips.lung}
        />
        <ProgressRow
          label="Skin Glow"
          value={skin}
          tooltipContent={tooltips.skin}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.neutral[800],
  },
});

export default HealthSummary;

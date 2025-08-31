import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Card } from './Card';
import ProgressRow from './ProgressRow';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { UserProfile } from '../../models/User';
import { AirQualityData } from '../../models/AirQuality';
import {
  deriveEnergy,
  deriveLung,
  deriveSkinGlow,
  getEnergyExplanation,
  getLungExplanation,
} from '../../utils/healthMetrics';
import { getSkinGlowTooltipContent } from '../../utils/tooltipContent';

interface HealthSummaryProps {
  userProfile?: UserProfile;
  airQuality?: AirQualityData;
}

// Skeleton component for loading state
const ProgressRowSkeleton: React.FC = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonRow}>
      <Animated.View style={[styles.skeletonLabel, { opacity }]} />
      <View style={styles.skeletonProgressContainer}>
        <Animated.View style={[styles.skeletonProgressBar, { opacity }]} />
        <Animated.View style={[styles.skeletonPercentage, { opacity }]} />
      </View>
    </View>
  );
};

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

  // Check if air quality data is available
  const isAirQualityLoading = !airQuality || airQuality.aqi === undefined;

  return (
    <View style={styles.container}>
      <Card variant="ghost">
        <Text style={styles.title}>Health Summary</Text>
        {isAirQualityLoading ? (
          <>
            <ProgressRowSkeleton />
            <ProgressRowSkeleton />
            <ProgressRowSkeleton />
          </>
        ) : (
          <>
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
          </>
        )}
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
  skeletonRow: {
    marginBottom: spacing.md,
  },
  skeletonLabel: {
    height: 16,
    width: '30%',
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  skeletonProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skeletonProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
  },
  skeletonPercentage: {
    height: 16,
    width: 40,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
  },
});

export default HealthSummary;

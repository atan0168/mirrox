import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AirQualityData } from '../../models/AirQuality';
import { UserProfile } from '../../models/User';
import { borderRadius, colors, fontSize, spacing } from '../../theme';
import { useHealthMetrics } from '../../hooks/useHealthMetrics';
import {
  getEnergyExplanation,
  getLungExplanation,
} from '../../utils/healthMetrics';
import { getSkinGlowTooltipContent } from '../../utils/tooltipContent';
import { Card } from './Card';
import ProgressRow from './ProgressRow';

interface HealthSummaryProps {
  userProfile?: UserProfile;
  airQuality?: AirQualityData;
  isError?: boolean;
  errorMessage?: string;
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
  isError = false,
  errorMessage = 'Unable to load health data. Please try again.',
}) => {
  const { healthMetrics, loading, error } = useHealthMetrics({
    userInputs: {
      sleepHours: userProfile?.sleepHours,
    },
  });

  const tooltips = {
    energy: getEnergyExplanation(userProfile?.sleepHours),
    lung: getLungExplanation({ aqi: airQuality?.aqi }),
    skin: getSkinGlowTooltipContent(),
  };

  // Check if health metrics are loading
  const isHealthMetricsLoading = loading || !healthMetrics;

  // Error state
  if (isError || error) {
    return (
      <View style={styles.container}>
        <Card variant="ghost">
          <Text style={styles.title}>Health Summary</Text>
          <View style={styles.errorContainer}>
            <AlertTriangle size={36} color={colors.red[600]} />
            <Text style={styles.errorMessage}>
              {error?.message || errorMessage}
            </Text>
            <Text style={styles.errorSubtext}>
              Check your connection and try refreshing
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card variant="ghost">
        <Text style={styles.title}>Health Summary</Text>
        {isHealthMetricsLoading ? (
          <>
            <ProgressRowSkeleton />
            <ProgressRowSkeleton />
            <ProgressRowSkeleton />
          </>
        ) : (
          <>
            <ProgressRow
              label="Energy"
              value={healthMetrics.energy}
              tooltipContent={tooltips.energy}
            />

            <ProgressRow
              label="Lung Health"
              value={healthMetrics.lungHealth}
              tooltipContent={tooltips.lung}
            />
            <ProgressRow
              label="Skin Glow"
              value={healthMetrics.skinHealth}
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
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.red[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
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

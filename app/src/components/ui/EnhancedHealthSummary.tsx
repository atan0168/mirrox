/**
 * Enhanced Health Summary Component
 *
 * Displays comprehensive health metrics for the digital twin with visual indicators,
 * trends, alerts, and recommendations. Supports Epic 1 and Epic 2 requirements.
 *
 * Features:
 * - Real-time health metrics visualization
 * - Environmental impact indicators
 * - Health trend arrows
 * - Alert notifications
 * - Actionable recommendations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors, fontSize, spacing } from '../../theme';
import { useHealthMetrics } from '../../hooks/useHealthMetrics';
import { HealthTrend } from '../../services/HealthMetricsService';
import {
  HealthMetrics,
  getEnergyExplanation,
  getLungExplanation,
  getSkinGlowExplanation,
  getCognitiveExplanation,
  getStressExplanation,
} from '../../utils/healthMetrics';
import ProgressRow from './ProgressRow';
import { Card } from './Card';
import CollapsibleCard from './CollapsibleCard';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Battery,
  Wind,
  Sun,
  Brain,
  Activity,
} from 'lucide-react-native';

interface EnhancedHealthSummaryProps {
  showTrends?: boolean;
  showAlerts?: boolean;
  showRecommendations?: boolean;
  compact?: boolean;
  onMetricPress?: (metric: keyof HealthMetrics) => void;
}

const EnhancedHealthSummary: React.FC<EnhancedHealthSummaryProps> = ({
  showTrends = true,
  showAlerts = true,
  showRecommendations = true,
  compact = false,
  onMetricPress,
}) => {
  // Using Accordion components for collapsible sections

  const {
    healthMetrics,
    loading,
    error,
    trends,
    recommendations,
    dataSources,
    dataAge,
  } = useHealthMetrics();

  // Loading animations setup (hooks must be unconditional)
  const iconComponents = [Battery, Wind, Sun, Brain, Activity] as const;
  const iconAnimsRef = useRef(iconComponents.map(() => new Animated.Value(0)));
  const iconAnims = iconAnimsRef.current;
  const skeletonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) return;
    const iconLoops = iconAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            delay: i * 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    const skeletonLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    iconLoops.forEach(loop => loop.start());
    skeletonLoop.start();
    return () => {
      iconLoops.forEach(loop => loop.stop());
      skeletonLoop.stop();
    };
  }, [loading, iconAnims, skeletonPulse]);

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Crunching your health signals…</Text>
          <View style={styles.loadingIconsRow}>
            {iconComponents.map((Icon, idx) => {
              const scale = iconAnims[idx].interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.25],
              });
              const rotate = iconAnims[idx].interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '15deg'],
              });
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.loadingIconWrap,
                    { transform: [{ scale }, { rotate }] },
                  ]}
                >
                  <Icon size={18} color={colors.neutral[600]} />
                </Animated.View>
              );
            })}
          </View>

          {/* Skeleton cards */}
          <Animated.View
            style={[
              styles.skeletonBlockLarge,
              {
                opacity: skeletonPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          />
          <View style={styles.skeletonRow}>
            <Animated.View
              style={[
                styles.skeletonBlock,
                {
                  opacity: skeletonPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonBlock,
                {
                  opacity: skeletonPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ]}
            />
          </View>
          <Animated.View
            style={[
              styles.skeletonBlock,
              {
                opacity: skeletonPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          />
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to calculate health metrics
          </Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      </Card>
    );
  }

  if (!healthMetrics) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No health data available</Text>
          <Text style={styles.errorSubtext}>
            Please check your profile settings
          </Text>
        </View>
      </Card>
    );
  }

  const getHealthColor = (value: number, inverted = false): string => {
    if (inverted) {
      // For stress index - lower is better
      if (value <= 30) return colors.green[500];
      if (value <= 50) return colors.yellow[500];
      if (value <= 70) return colors.orange[500];
      return colors.red[500];
    } else {
      // For other metrics - higher is better
      if (value >= 80) return colors.green[500];
      if (value >= 60) return colors.yellow[500];
      if (value >= 40) return colors.orange[500];
      return colors.red[500];
    }
  };

  const metricColors = {
    energy: colors.green[500],
    lungHealth: colors.orange[500],
    skinHealth: colors.yellow[500],
    cognitiveFunction: colors.primary,
    stressIndex: colors.red[500],
  } as const;

  const getTrendIcon = (trend: HealthTrend): React.ReactNode => {
    if (trend.trend === 'improving')
      return <TrendingUp size={16} color={colors.green[600]} />;
    if (trend.trend === 'declining')
      return <TrendingDown size={16} color={colors.red[600]} />;
    return <Minus size={16} color={colors.neutral[600]} />;
  };

  const handleMetricPress = (metric: keyof HealthMetrics) => {
    if (onMetricPress) {
      onMetricPress(metric);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overall Health Score */}
      <Card style={styles.overallHealthCard}>
        <View style={styles.overallHealthHeader}>
          <Text style={styles.overallHealthTitle}>Overall Health</Text>
          <View style={styles.dataSourcesContainer}>
            {Object.entries(dataSources).map(([source, status]) => (
              <View key={source} style={styles.dataSourceIndicator}>
                <View
                  style={[
                    styles.dataSourceDot,
                    {
                      backgroundColor: status.available
                        ? colors.green[500]
                        : colors.neutral[400],
                    },
                  ]}
                />
                <Text style={styles.dataSourceLabel}>
                  {source === 'airQuality'
                    ? 'Air'
                    : source === 'traffic'
                      ? 'Traffic'
                      : 'Profile'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.overallHealthContent}>
          <Text
            style={[
              styles.overallHealthScore,
              { color: getHealthColor(healthMetrics.overallHealth) },
            ]}
          >
            {healthMetrics.overallHealth}%
          </Text>
          <Text style={styles.overallHealthDescription}>
            {healthMetrics.overallHealth >= 80
              ? 'Excellent'
              : healthMetrics.overallHealth >= 60
                ? 'Good'
                : healthMetrics.overallHealth >= 40
                  ? 'Fair'
                  : 'Needs Attention'}
          </Text>
        </View>

        {dataAge > 300 && (
          <Text style={styles.dataAgeWarning}>
            Data is {Math.floor(dataAge / 60)} minutes old
          </Text>
        )}
      </Card>

      {/* Individual Health Metrics */}
      <Card style={styles.metricsCard}>
        <Text style={styles.sectionTitle}>Health Metrics</Text>

        <TouchableOpacity onPress={() => handleMetricPress('energy')}>
          <ProgressRow
            label="Energy Level"
            value={healthMetrics.energy}
            color={metricColors.energy}
            icon={<Battery size={18} color={metricColors.energy} />}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'energy') || ({} as HealthTrend)
            )}
            tooltipTitle="Energy — Sleep & Work Balance"
            tooltipContent={getEnergyExplanation()}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleMetricPress('lungHealth')}>
          <ProgressRow
            label="Lung Health"
            value={healthMetrics.lungHealth}
            color={metricColors.lungHealth}
            icon={<Wind size={18} color={metricColors.lungHealth} />}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'lungHealth') || ({} as HealthTrend)
            )}
            tooltipTitle="Lung Health — Air Quality"
            tooltipContent={getLungExplanation()}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleMetricPress('skinHealth')}>
          <ProgressRow
            label="Skin Health"
            value={healthMetrics.skinHealth}
            color={metricColors.skinHealth}
            icon={<Sun size={18} color={metricColors.skinHealth} />}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'skinHealth') || ({} as HealthTrend)
            )}
            tooltipTitle="Skin Health — UV & Stress"
            tooltipContent={getSkinGlowExplanation()}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleMetricPress('cognitiveFunction')}
        >
          <ProgressRow
            label="Cognitive Function"
            value={healthMetrics.cognitiveFunction}
            color={metricColors.cognitiveFunction}
            icon={<Brain size={18} color={colors.neutral[700]} />}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'cognitiveFunction') ||
                ({} as HealthTrend)
            )}
            tooltipTitle="Cognition — Sleep, Air, Stress"
            tooltipContent={getCognitiveExplanation()}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleMetricPress('stressIndex')}>
          <ProgressRow
            label="Stress Level"
            value={100 - healthMetrics.stressIndex} // Invert for display (higher = better)
            color={metricColors.stressIndex}
            icon={<Activity size={18} color={metricColors.stressIndex} />}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'stressIndex') ||
                ({} as HealthTrend)
            )}
            tooltipTitle="Stress — Commute, Sleep, Work"
            tooltipContent={getStressExplanation()}
          />
        </TouchableOpacity>
      </Card>

      <View style={styles.recommendationsContainer}>
        {/* Health Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <CollapsibleCard
            title="Recommendations"
            count={recommendations.length}
            defaultExpanded={!compact}
          >
            <View style={styles.recommendationsList}>
              {recommendations
                .slice(0, compact ? 3 : recommendations.length)
                .map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationText}>
                      {recommendation}
                    </Text>
                  </View>
                ))}
            </View>
          </CollapsibleCard>
        )}

        {/* Health Trends */}
        {showTrends && trends.length > 0 && !compact && (
          <CollapsibleCard
            title="Weekly Trends"
            count={trends.length}
            defaultExpanded={false}
          >
            <View style={styles.trendsList}>
              {trends.map(trend => (
                <View key={trend.metric} style={styles.trendItem}>
                  <Text style={styles.trendMetric}>
                    {trend.metric === 'lungHealth'
                      ? 'Lung Health'
                      : trend.metric === 'skinHealth'
                        ? 'Skin Health'
                        : trend.metric === 'cognitiveFunction'
                          ? 'Cognitive Function'
                          : trend.metric === 'stressIndex'
                            ? 'Stress Level'
                            : trend.metric === 'overallHealth'
                              ? 'Overall Health'
                              : 'Energy Level'}
                  </Text>
                  <View style={styles.trendValues}>
                    {getTrendIcon(trend)}
                    <Text style={styles.trendChange}>
                      {trend.change > 0 ? '+' : ''}
                      {trend.change.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </CollapsibleCard>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  loadingIconsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
  },
  skeletonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skeletonBlockLarge: {
    width: '100%',
    height: 80,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    marginTop: spacing.md,
  },
  skeletonBlock: {
    flex: 1,
    height: 48,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error[600],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  overallHealthCard: {
    marginBottom: spacing.md,
  },
  overallHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  overallHealthTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  dataSourcesContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dataSourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dataSourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dataSourceLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
  },
  overallHealthContent: {
    alignItems: 'center',
  },
  overallHealthScore: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  overallHealthDescription: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  dataAgeWarning: {
    fontSize: fontSize.xs,
    color: colors.yellow[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  metricsCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  expandIcon: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  alertsCard: {
    marginBottom: spacing.md,
  },
  alertsList: {
    gap: spacing.md,
  },
  alertItem: {
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow[500],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertIcon: {
    fontSize: fontSize.lg,
  },
  alertMessage: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  alertRecommendation: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
    paddingLeft: spacing.lg,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
  dismissButtonText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  recommendationsContainer: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  recommendationsCard: {
    marginBottom: spacing.md,
  },
  recommendationsList: {
    gap: spacing.sm,
  },
  recommendationItem: {
    paddingVertical: spacing.xs,
  },
  recommendationText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 22,
  },
  trendsCard: {
    marginBottom: spacing.md,
  },
  trendsList: {
    gap: spacing.sm,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  trendMetric: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  trendValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendIcon: {
    fontSize: fontSize.base,
  },
  trendChange: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    fontWeight: '600',
  },
});

export default EnhancedHealthSummary;

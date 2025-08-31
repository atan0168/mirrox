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

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert as RNAlert,
} from 'react-native';
import { colors, fontSize, spacing } from '../../theme';
import { useHealthMetrics } from '../../hooks/useHealthMetrics';
import { HealthTrend, HealthAlert } from '../../services/HealthMetricsService';
import {
  HealthMetrics,
  getEnergyExplanation,
  getLungExplanation,
  getSkinGlowExplanation,
} from '../../utils/healthMetrics';
import ProgressRow from './ProgressRow';
import { Badge } from './Badge';
import { Card } from './Card';
import { Button } from './Button';
import Tooltip from './Tooltip';

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const {
    healthMetrics,
    loading,
    error,
    trends,
    alerts,
    recommendations,
    dismissAlert,
    dataSources,
    dataAge,
  } = useHealthMetrics();

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calculating health metrics...</Text>
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

  const getTrendIcon = (trend: HealthTrend): string => {
    if (trend.trend === 'improving') return '↗️';
    if (trend.trend === 'declining') return '↘️';
    return '→';
  };

  const getAlertIcon = (alert: HealthAlert): string => {
    switch (alert.type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const handleMetricPress = (metric: keyof HealthMetrics) => {
    if (onMetricPress) {
      onMetricPress(metric);
    }
  };

  const handleAlertDismiss = (alert: HealthAlert) => {
    RNAlert.alert(
      'Dismiss Alert',
      `Are you sure you want to dismiss this alert: "${alert.message}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => dismissAlert(alert.id),
        },
      ]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
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
            color={getHealthColor(healthMetrics.energy)}
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
            color={getHealthColor(healthMetrics.lungHealth)}
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
            color={getHealthColor(healthMetrics.skinHealth)}
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
            color={getHealthColor(healthMetrics.cognitiveFunction)}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'cognitiveFunction') ||
                ({} as HealthTrend)
            )}
            tooltipTitle="Cognition — Sleep, Air, Stress"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleMetricPress('stressIndex')}>
          <ProgressRow
            label="Stress Level"
            value={100 - healthMetrics.stressIndex} // Invert for display (higher = better)
            color={getHealthColor(healthMetrics.stressIndex, true)}
            showTrend={showTrends}
            trendIcon={getTrendIcon(
              trends.find(t => t.metric === 'stressIndex') ||
                ({} as HealthTrend)
            )}
            tooltipTitle="Stress — Commute, Sleep, Work"
          />
        </TouchableOpacity>
      </Card>

      {/* Health Alerts */}
      {showAlerts && alerts.length > 0 && (
        <Card style={styles.alertsCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('alerts')}
          >
            <Text style={styles.sectionTitle}>
              Health Alerts ({alerts.length})
            </Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'alerts' ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {(expandedSection === 'alerts' || !compact) && (
            <View style={styles.alertsList}>
              {alerts.slice(0, compact ? 3 : alerts.length).map(alert => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertIcon}>{getAlertIcon(alert)}</Text>
                    <Text
                      style={[
                        styles.alertMessage,
                        {
                          color:
                            alert.type === 'critical'
                              ? colors.red[600]
                              : alert.type === 'warning'
                                ? colors.yellow[600]
                                : colors.neutral[600],
                        },
                      ]}
                    >
                      {alert.message}
                    </Text>
                  </View>

                  {alert.recommendation && (
                    <Text style={styles.alertRecommendation}>
                      💡 {alert.recommendation}
                    </Text>
                  )}

                  <View style={styles.alertActions}>
                    <Badge
                      variant={
                        alert.severity >= 8
                          ? 'default'
                          : alert.severity >= 6
                            ? 'secondary'
                            : 'outline'
                      }
                      size="sm"
                    >
                      Severity: {alert.severity}/10
                    </Badge>
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={() => handleAlertDismiss(alert)}
                    >
                      <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Health Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Card style={styles.recommendationsCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('recommendations')}
          >
            <Text style={styles.sectionTitle}>
              Recommendations ({recommendations.length})
            </Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'recommendations' ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {(expandedSection === 'recommendations' || !compact) && (
            <View style={styles.recommendationsList}>
              {recommendations
                .slice(0, compact ? 3 : recommendations.length)
                .map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationText}>
                      • {recommendation}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </Card>
      )}

      {/* Health Trends */}
      {showTrends && trends.length > 0 && !compact && (
        <Card style={styles.trendsCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('trends')}
          >
            <Text style={styles.sectionTitle}>Weekly Trends</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'trends' ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSection === 'trends' && (
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
                    <Text style={styles.trendIcon}>{getTrendIcon(trend)}</Text>
                    <Text style={styles.trendChange}>
                      {trend.change > 0 ? '+' : ''}
                      {trend.change.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
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

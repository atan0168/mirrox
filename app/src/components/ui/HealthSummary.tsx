import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { UserProfile } from '../../models/User';
import { AirQualityData } from '../../models/AirQuality';
import { getAQIInfo } from '../../utils/aqiUtils';

interface HealthSummaryProps {
  userProfile: UserProfile | null;
  airQuality: AirQualityData | null;
}

interface HealthMetric {
  title: string;
  value: string;
  status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
  description: string;
  icon: string;
}

const HealthSummary: React.FC<HealthSummaryProps> = ({
  userProfile,
  airQuality,
}) => {
  const calculateHealthScore = (): number => {
    let score = 100;

    // Air quality impact (40% of score)
    if (airQuality?.aqi) {
      const aqi = airQuality.aqi;
      if (aqi > 300) score -= 40;
      else if (aqi > 200) score -= 35;
      else if (aqi > 150) score -= 25;
      else if (aqi > 100) score -= 15;
      else if (aqi > 50) score -= 5;
    }

    // Sleep impact (30% of score)
    if (userProfile?.sleepHours) {
      const sleep = userProfile.sleepHours;
      if (sleep < 4) score -= 30;
      else if (sleep < 6) score -= 20;
      else if (sleep < 7) score -= 10;
      else if (sleep >= 8) score += 5; // Bonus for good sleep
    }

    // Commute impact (30% of score)
    if (userProfile?.commuteMode) {
      const commute = userProfile.commuteMode;
      switch (commute) {
        case 'walk':
        case 'bike':
          score += 10; // Bonus for active commuting
          break;
        case 'transit':
          score += 5; // Small bonus for public transport
          break;
        case 'wfh':
          // Neutral
          break;
        case 'car':
          score -= 5; // Small penalty for car use
          break;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getHealthStatus = (
    score: number
  ): 'excellent' | 'good' | 'moderate' | 'poor' | 'critical' => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'poor';
    return 'critical';
  };

  const getStatusColor = (
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  ): string => {
    switch (status) {
      case 'excellent':
        return '#10B981'; // Green
      case 'good':
        return '#34D399'; // Light green
      case 'moderate':
        return '#F59E0B'; // Yellow
      case 'poor':
        return '#F97316'; // Orange
      case 'critical':
        return '#EF4444'; // Red
      default:
        return colors.neutral[500];
    }
  };

  const getAirQualityMetric = (): HealthMetric => {
    if (!airQuality?.aqi) {
      return {
        title: 'Air Quality',
        value: 'N/A',
        status: 'moderate',
        description: 'Unable to assess air quality',
        icon: '🌫️',
      };
    }

    const aqi = airQuality.aqi;
    const aqiInfo = getAQIInfo(aqi);
    let status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    let icon: string;

    if (aqi <= 50) {
      status = 'excellent';
      icon = '🌱';
    } else if (aqi <= 100) {
      status = 'good';
      icon = '🌿';
    } else if (aqi <= 150) {
      status = 'moderate';
      icon = '⚠️';
    } else if (aqi <= 200) {
      status = 'poor';
      icon = '😷';
    } else {
      status = 'critical';
      icon = '🚨';
    }

    return {
      title: 'Air Quality',
      value: `AQI ${aqi}`,
      status,
      description: aqiInfo.classification,
      icon,
    };
  };

  const getSleepMetric = (): HealthMetric => {
    if (!userProfile?.sleepHours) {
      return {
        title: 'Sleep Quality',
        value: 'N/A',
        status: 'moderate',
        description: 'Sleep data not available',
        icon: '😴',
      };
    }

    const hours = userProfile.sleepHours;
    let status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    let description: string;
    let icon: string;

    if (hours >= 8) {
      status = 'excellent';
      description = 'Well-rested';
      icon = '😊';
    } else if (hours >= 7) {
      status = 'good';
      description = 'Good sleep';
      icon = '🙂';
    } else if (hours >= 6) {
      status = 'moderate';
      description = 'Could be better';
      icon = '😐';
    } else if (hours >= 4) {
      status = 'poor';
      description = 'Sleep deprived';
      icon = '😴';
    } else {
      status = 'critical';
      description = 'Severely sleep deprived';
      icon = '😵';
    }

    return {
      title: 'Sleep Quality',
      value: `${hours}h`,
      status,
      description,
      icon,
    };
  };

  const getCommuteMetric = (): HealthMetric => {
    if (!userProfile?.commuteMode) {
      return {
        title: 'Commute Impact',
        value: 'N/A',
        status: 'moderate',
        description: 'Commute data not available',
        icon: '🚶',
      };
    }

    const mode = userProfile.commuteMode;
    let status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    let description: string;
    let icon: string;
    let value: string;

    switch (mode) {
      case 'walk':
        status = 'excellent';
        description = 'Active & eco-friendly';
        icon = '🚶';
        value = 'Walking';
        break;
      case 'bike':
        status = 'excellent';
        description = 'Active & eco-friendly';
        icon = '🚴';
        value = 'Cycling';
        break;
      case 'transit':
        status = 'good';
        description = 'Eco-friendly choice';
        icon = '🚌';
        value = 'Public Transit';
        break;
      case 'wfh':
        status = 'good';
        description = 'No commute stress';
        icon = '🏠';
        value = 'Work from Home';
        break;
      case 'car':
        status = 'moderate';
        description = 'Consider alternatives';
        icon = '🚗';
        value = 'Driving';
        break;
      default:
        status = 'moderate';
        description = 'Unknown commute';
        icon = '❓';
        value = 'Unknown';
    }

    return {
      title: 'Commute Impact',
      value,
      status,
      description,
      icon,
    };
  };

  const healthScore = calculateHealthScore();
  const healthStatus = getHealthStatus(healthScore);
  const airQualityMetric = getAirQualityMetric();
  const sleepMetric = getSleepMetric();
  const commuteMetric = getCommuteMetric();

  const metrics = [airQualityMetric, sleepMetric, commuteMetric];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Health Summary</Text>

      {/* Overall Health Score */}
      <Card
        variant="outline"
        style={{
          ...styles.scoreCard,
          borderColor: getStatusColor(healthStatus),
        }}
      >
        <View style={styles.scoreHeader}>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Overall Health Score</Text>
            <Text
              style={[
                styles.scoreValue,
                { color: getStatusColor(healthStatus) },
              ]}
            >
              {healthScore}/100
            </Text>
          </View>
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: getStatusColor(healthStatus) },
            ]}
          >
            <Text style={styles.scoreBadgeText}>
              {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.scoreDescription}>
          Based on air quality, sleep, and lifestyle factors
        </Text>
      </Card>

      {/* Health Metrics */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Card key={index} variant="outline" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricIcon}>{metric.icon}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: getStatusColor(metric.status) },
              ]}
            >
              {metric.value}
            </Text>
            <Text style={styles.metricDescription}>{metric.description}</Text>
          </Card>
        ))}
      </View>

      {/* Health Tips */}
      {healthScore < 80 && (
        <Card variant="outline" style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Health Tips</Text>
          <View style={styles.tipsList}>
            {airQualityMetric.status === 'poor' ||
            airQualityMetric.status === 'critical' ? (
              <Text style={styles.tipItem}>
                • Consider wearing a mask outdoors
              </Text>
            ) : null}
            {sleepMetric.status === 'poor' ||
            sleepMetric.status === 'critical' ? (
              <Text style={styles.tipItem}>
                • Aim for 7-9 hours of sleep tonight
              </Text>
            ) : null}
            {commuteMetric.status === 'moderate' ? (
              <Text style={styles.tipItem}>
                • Try walking or cycling for short trips
              </Text>
            ) : null}
            {healthScore < 60 ? (
              <Text style={styles.tipItem}>
                • Consider indoor activities if air quality is poor
              </Text>
            ) : null}
          </View>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    color: colors.neutral[800],
  },
  scoreCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scoreBadgeText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  scoreDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    padding: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.xs,
  },
  metricTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    flex: 1,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  metricDescription: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
  },
  tipsCard: {
    padding: spacing.md,
    backgroundColor: '#FEF3C7', // Light yellow
    borderColor: '#F59E0B', // Yellow
  },
  tipsTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#92400E', // Dark yellow
    marginBottom: spacing.sm,
  },
  tipsList: {
    gap: spacing.xs,
  },
  tipItem: {
    fontSize: fontSize.sm,
    color: '#78350F', // Darker yellow
    lineHeight: 18,
  },
});

export default HealthSummary;

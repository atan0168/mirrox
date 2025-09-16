import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertOctagon } from 'lucide-react-native';
import { useTrafficData } from '../../hooks/useTrafficData';
import { Card } from './Card';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import Loader from './Loader';
import { getTrafficDisplay } from './display/traffic';

interface TrafficInfoCardProps {
  latitude?: number;
  longitude?: number;
  enabled?: boolean;
}

export const TrafficInfoCard: React.FC<TrafficInfoCardProps> = ({
  latitude,
  longitude,
  enabled = true,
}) => {
  const { data, loading, error, lastUpdated } = useTrafficData({
    latitude,
    longitude,
    enabled: enabled && !!latitude && !!longitude,
    refreshInterval: 300000, // 5 minutes
  });

  if (!enabled || !latitude || !longitude) {
    return (
      <Card variant="default">
        <Text style={styles.title}>Traffic Conditions</Text>
        <Text style={styles.disabled}>Location required for traffic data</Text>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card variant="default">
        <Text style={styles.title}>Traffic Conditions</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.neutral[500]} />
          <Text style={styles.loading}>Loading traffic data...</Text>
        </View>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card variant="default">
        <Text style={styles.title}>Traffic Conditions</Text>
        <Text style={styles.error}>Unable to load traffic data</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="default">
        <Text style={styles.title}>Traffic Conditions</Text>
        <Text style={styles.noData}>No traffic data available</Text>
      </Card>
    );
  }

  const {
    color: stressColor,
    icon: stressIcon,
    description,
  } = getTrafficDisplay(data ?? null, false, 20);

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Traffic Conditions</Text>
        {loading && <Loader />}
      </View>

      <View style={styles.stressLevelContainer}>
        <View style={styles.stressIcon}>{stressIcon}</View>
        <View style={styles.stressInfo}>
          <Text style={[styles.stressLevel, { color: stressColor }]}>
            {(description ? description : 'Unknown').toUpperCase()}
          </Text>
          <Text style={styles.stressDescription}>
            {description || 'Unknown traffic conditions'}
          </Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Congestion Factor</Text>
          <Text style={[styles.metricValue, { color: stressColor }]}>
            {data.congestionFactor.toFixed(1)}x
          </Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Current Speed</Text>
          <Text style={styles.metricValue}>{data.currentSpeed} km/h</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Free Flow Speed</Text>
          <Text style={styles.metricValue}>{data.freeFlowSpeed} km/h</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Travel Time</Text>
          <Text style={styles.metricValue}>
            {Math.round(data.currentTravelTime / 60)}min
            {data.freeFlowTravelTime > 0 && (
              <Text style={styles.metricSubtext}>
                {' '}
                (vs {Math.round(data.freeFlowTravelTime / 60)}min normal)
              </Text>
            )}
          </Text>
        </View>
      </View>

      {data.roadClosure && (
        <View style={styles.warningContainer}>
          <View style={styles.warningIcon}>
            <AlertOctagon size={16} color={colors.neutral[700]} />
          </View>
          <Text style={styles.warningText}>Road closure detected</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {lastUpdated
            ? ` Updated: ${lastUpdated.toLocaleTimeString()}`
            : ' No updates'}
        </Text>
        <Text style={styles.confidence}>
          Confidence: {Math.round(data.confidence * 100)}%
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  refreshIndicator: {
    marginLeft: spacing.sm,
  },
  stressLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
  },
  stressIcon: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stressInfo: {
    flex: 1,
  },
  stressLevel: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stressDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metric: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  metricSubtext: {
    fontSize: fontSize.xs,
    color: colors.neutral[400],
    fontWeight: 'normal',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.light,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  warningIcon: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[400],
  },
  confidence: {
    fontSize: fontSize.xs,
    color: colors.neutral[400],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loading: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorDetail: {
    fontSize: fontSize.xs,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  disabled: {
    fontSize: fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noData: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

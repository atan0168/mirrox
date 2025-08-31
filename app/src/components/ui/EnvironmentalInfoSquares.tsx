import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Wind,
  Car,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  getAQIInfo,
  getShortClassification,
  formatPollutantValue,
  formatTimestamp,
} from '../../utils/aqiUtils';

interface AirQualityData {
  aqi?: number;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  classification?: string;
  colorCode?: string;
  healthAdvice?: string;
  timestamp?: string;
  source?: string;
  location?: {
    name?: string;
  };
  primaryPollutant?: string;
}

interface TrafficData {
  stressLevel: string;
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
}

interface EnvironmentalInfoSquaresProps {
  airQuality?: AirQualityData | null;
  trafficData?: TrafficData | null;
  isAirQualityLoading?: boolean;
  isTrafficLoading?: boolean;
}

export const EnvironmentalInfoSquares: React.FC<
  EnvironmentalInfoSquaresProps
> = ({
  airQuality,
  trafficData,
  isAirQualityLoading = false,
  isTrafficLoading = false,
}) => {
  const [selectedModal, setSelectedModal] = useState<'air' | 'traffic' | null>(
    null
  );

  const getAirQualityColor = () => {
    if (!airQuality?.aqi) return colors.neutral[400];
    return airQuality.colorCode || getAQIInfo(airQuality.aqi).colorCode;
  };

  const getAirQualityIcon = () => {
    if (!airQuality?.aqi) return <Wind size={24} color={colors.neutral[400]} />;
    const aqi = airQuality.aqi;
    const color = getAirQualityColor();

    if (aqi <= 50) return <CheckCircle size={24} color={color} />;
    if (aqi <= 100) return <Activity size={24} color={color} />;
    if (aqi <= 150) return <AlertTriangle size={24} color={color} />;
    return <XCircle size={24} color={color} />;
  };

  const getTrafficColor = () => {
    if (!trafficData) return colors.neutral[400];
    switch (trafficData.stressLevel) {
      case 'none':
        return '#4CAF50';
      case 'mild':
        return '#FFC107';
      case 'moderate':
        return '#FF9800';
      case 'high':
        return '#F44336';
      default:
        return colors.neutral[400];
    }
  };

  const getTrafficIcon = () => {
    if (!trafficData) return <Car size={24} color={colors.neutral[400]} />;
    const color = getTrafficColor();

    switch (trafficData.stressLevel) {
      case 'none':
        return <CheckCircle size={24} color={color} />;
      case 'mild':
        return <AlertTriangle size={24} color={color} />;
      case 'moderate':
        return <AlertCircle size={24} color={color} />;
      case 'high':
        return <XCircle size={24} color={color} />;
      default:
        return <Car size={24} color={color} />;
    }
  };

  const renderAirQualityModal = () => (
    <Modal
      visible={selectedModal === 'air'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Air Quality Details</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {airQuality && (
            <>
              <Card
                variant="outline"
                style={[
                  styles.detailCard,
                  { borderColor: getAirQualityColor() },
                ]}
              >
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Air Quality Index</Text>
                  <Text
                    style={[styles.aqiValue, { color: getAirQualityColor() }]}
                  >
                    {airQuality.aqi}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.aqiClassification,
                    { color: getAirQualityColor() },
                  ]}
                >
                  {airQuality.classification ||
                    getShortClassification(
                      getAQIInfo(airQuality.aqi).classification
                    )}
                </Text>
                {airQuality.healthAdvice && (
                  <Text style={styles.healthAdvice}>
                    {airQuality.healthAdvice}
                  </Text>
                )}
                {airQuality.timestamp && (
                  <Text style={styles.timestamp}>
                    Updated {formatTimestamp(airQuality.timestamp)} •{' '}
                    {airQuality.source?.toUpperCase() || 'AQICN'}
                  </Text>
                )}
              </Card>

              <View style={styles.pollutantsSection}>
                <Text style={styles.sectionTitle}>Pollutant Levels</Text>
                <View style={styles.pollutantGrid}>
                  {airQuality.pm25 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM2.5</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.pm25, 'pm25')}
                      </Text>
                    </View>
                  )}
                  {airQuality.pm10 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>PM10</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.pm10, 'pm10')}
                      </Text>
                    </View>
                  )}
                  {airQuality.o3 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>Ozone</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.o3, 'o3')}
                      </Text>
                    </View>
                  )}
                  {airQuality.no2 && (
                    <View style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>NO₂</Text>
                      <Text style={styles.pollutantValue}>
                        {formatPollutantValue(airQuality.no2, 'no2')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            variant="secondary"
            onPress={() => setSelectedModal(null)}
            fullWidth
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderTrafficModal = () => (
    <Modal
      visible={selectedModal === 'traffic'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Traffic Conditions</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {trafficData && (
            <>
              <Card
                variant="outline"
                style={[styles.detailCard, { borderColor: getTrafficColor() }]}
              >
                <View style={styles.trafficHeader}>
                  <Text style={styles.trafficTitle}>Current Conditions</Text>
                  <Text
                    style={[styles.trafficLevel, { color: getTrafficColor() }]}
                  >
                    {trafficData.stressLevel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.trafficDescription}>
                  {trafficData.stressLevel === 'none' &&
                    'Traffic is flowing smoothly'}
                  {trafficData.stressLevel === 'mild' &&
                    'Light traffic congestion detected'}
                  {trafficData.stressLevel === 'moderate' &&
                    'Moderate traffic delays expected'}
                  {trafficData.stressLevel === 'high' &&
                    'Heavy traffic congestion - high stress'}
                </Text>
              </Card>

              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Traffic Metrics</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Congestion Factor</Text>
                    <Text
                      style={[styles.metricValue, { color: getTrafficColor() }]}
                    >
                      {trafficData.congestionFactor.toFixed(1)}x
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Current Speed</Text>
                    <Text style={styles.metricValue}>
                      {trafficData.currentSpeed} km/h
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Free Flow Speed</Text>
                    <Text style={styles.metricValue}>
                      {trafficData.freeFlowSpeed} km/h
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Travel Time</Text>
                    <Text style={styles.metricValue}>
                      {Math.round(trafficData.currentTravelTime / 60)}min
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            variant="secondary"
            onPress={() => setSelectedModal(null)}
            fullWidth
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Environmental Overview</Text>

      <View style={styles.squaresGrid}>
        {/* Air Quality Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getAirQualityColor() }]}
          onPress={() => setSelectedModal('air')}
          disabled={isAirQualityLoading}
        >
          <View style={styles.squareIcon}>{getAirQualityIcon()}</View>
          <Text style={styles.squareValue}>
            {isAirQualityLoading ? '...' : airQuality?.aqi || 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Air Quality</Text>
          {airQuality && (
            <Text
              style={[styles.squareStatus, { color: getAirQualityColor() }]}
            >
              {airQuality.classification ||
                getShortClassification(
                  getAQIInfo(airQuality.aqi).classification
                )}
            </Text>
          )}
        </TouchableOpacity>

        {/* Traffic Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getTrafficColor() }]}
          onPress={() => setSelectedModal('traffic')}
          disabled={isTrafficLoading}
        >
          <View style={styles.squareIcon}>{getTrafficIcon()}</View>
          <Text style={styles.squareValue}>
            {isTrafficLoading
              ? '...'
              : trafficData?.congestionFactor.toFixed(1) + 'x' || 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Traffic</Text>
          {trafficData && (
            <Text style={[styles.squareStatus, { color: getTrafficColor() }]}>
              {trafficData.stressLevel}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {renderAirQualityModal()}
      {renderTrafficModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  squaresGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  square: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 140,
  },
  squareIcon: {
    marginBottom: spacing.sm,
  },
  squareValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  squareLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  squareStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.neutral[600],
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalFooter: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aqiTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  aqiValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  aqiClassification: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  healthAdvice: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trafficTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  trafficLevel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  trafficDescription: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  pollutantsSection: {
    marginBottom: spacing.lg,
  },
  pollutantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pollutantItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  pollutantLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  pollutantValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  metricsSection: {
    marginBottom: spacing.lg,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});

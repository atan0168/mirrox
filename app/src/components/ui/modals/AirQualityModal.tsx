import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, fontSize, borderRadius } from '../../../theme';
import { formatPollutantValue, formatTimestamp } from '../../../utils/aqiUtils';
import { getAirQualityDisplay } from '../display/airQuality';

interface AirQualityData {
  aqi?: number;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  classification?: string;
  healthAdvice?: string;
  timestamp?: string;
  source?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  airQuality?: AirQualityData | null;
  isError?: boolean;
  errorMessage?: string;
  color?: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const AirQualityModal: React.FC<Props> = ({
  visible,
  onClose,
  airQuality,
  isError = false,
  errorMessage = 'Unable to load air quality data',
  color = colors.neutral[400],
  locationLabel,
  latitude,
  longitude,
}) => {
  const { color: computedColor, statusText } = getAirQualityDisplay(
    airQuality ?? null,
    isError
  );
  const borderColor = color || computedColor;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Air Quality Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {isError ? (
            <Card
              variant="outline"
              style={{ ...styles.detailCard, borderColor: colors.red[500] }}
            >
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>
                  Failed to Load Air Quality Data
                </Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : airQuality ? (
            <>
              <Card
                variant="outline"
                style={{ ...styles.detailCard, borderColor }}
              >
                {latitude != null && longitude != null && (
                  <Text style={styles.locationLine}>
                    Location: {locationLabel || 'Fetching…'} • (
                    {latitude.toFixed(4)}, {longitude.toFixed(4)})
                  </Text>
                )}
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Air Quality Index</Text>
                  <Text style={[styles.aqiValue, { color: borderColor }]}>
                    {airQuality.aqi}
                  </Text>
                </View>
                <Text
                  style={[styles.aqiClassification, { color: borderColor }]}
                >
                  {statusText}
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
          ) : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button variant="secondary" onPress={onClose} fullWidth>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.neutral[50],
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
    backgroundColor: colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.red[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.red[500],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    textAlign: 'center',
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
    fontSize: fontSize.base,
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
  locationLine: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
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
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
});

export default AirQualityModal;

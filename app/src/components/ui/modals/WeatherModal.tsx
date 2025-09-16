import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, fontSize, borderRadius } from '../../../theme';
import { getUVProtectionRecommendation } from '../../../utils/skinEffectsUtils';

interface WeatherModalProps {
  visible: boolean;
  onClose: () => void;
  temperature?: number | null;
  humidity?: number | null;
  uvIndex?: number | null;
  uvForecast?: Array<{ avg: number; day: string; max: number; min: number }> | null;
  isError?: boolean;
  errorMessage?: string;
  color?: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const getUVCategory = (uv: number): string => {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
};

const formatTemperature = (temp?: number | null) => {
  if (temp == null) return 'N/A';
  return `${temp.toFixed(1)}°C`;
};

const formatHumidity = (humidity?: number | null) => {
  if (humidity == null) return 'N/A';
  return `${Math.round(humidity)}%`;
};

const formatUV = (uv?: number | null) => {
  if (uv == null) return 'N/A';
  return `${uv.toFixed(1)}`;
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const formatDayLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dayNames[date.getDay()] ?? value;
};

export const WeatherModal: React.FC<WeatherModalProps> = ({
  visible,
  onClose,
  temperature,
  humidity,
  uvIndex,
  uvForecast,
  isError = false,
  errorMessage = 'Weather details unavailable',
  color = colors.neutral[400],
  locationLabel,
  latitude,
  longitude,
}) => {
  const hasWeatherData =
    temperature != null || humidity != null || uvIndex != null;

  const resolvedUVIndex = uvIndex ?? null;
  const uvCategory =
    resolvedUVIndex != null ? getUVCategory(resolvedUVIndex) : null;
  const uvAdvice = getUVProtectionRecommendation(resolvedUVIndex);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Local Weather</Text>
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
                <Text style={styles.errorTitle}>Unable to load weather</Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : hasWeatherData ? (
            <>
              <Card
                variant="outline"
                style={{ ...styles.detailCard, borderColor: color }}
              >
                {latitude != null && longitude != null && (
                  <Text style={styles.locationLine}>
                    Location: {locationLabel || 'Fetching…'} • (
                    {latitude.toFixed(4)}, {longitude.toFixed(4)})
                  </Text>
                )}
                <Text style={styles.sectionTitle}>Current Temperature</Text>
                <Text style={[styles.temperatureValue, { color }]}>
                  {formatTemperature(temperature)}
                </Text>

                <View style={styles.readingsRow}>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>Humidity</Text>
                    <Text style={styles.readingValue}>
                      {formatHumidity(humidity)}
                    </Text>
                  </View>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>UV Index</Text>
                    <Text style={styles.readingValue}>
                      {formatUV(resolvedUVIndex)}
                      {uvCategory ? ` • ${uvCategory}` : ''}
                    </Text>
                  </View>
                </View>

                {resolvedUVIndex != null && (
                  <Text style={styles.uvRecommendation}>{uvAdvice}</Text>
                )}
              </Card>

              {uvForecast && uvForecast.length > 0 && (
                <View style={styles.forecastSection}>
                  <Text style={styles.sectionTitle}>UV Forecast</Text>
                  <View style={styles.forecastGrid}>
                    {uvForecast.slice(0, 4).map(item => (
                      <View key={item.day} style={styles.forecastItem}>
                        <Text style={styles.forecastDay}>
                          {formatDayLabel(item.day)}
                        </Text>
                        <Text style={styles.forecastValue}>
                          Avg {item.avg?.toFixed(1) ?? '—'}
                        </Text>
                        <Text style={styles.forecastRange}>
                          {`Min ${item.min?.toFixed(1) ?? '—'} / Max ${item.max?.toFixed(1) ?? '—'}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <Card variant="outline" style={styles.detailCard}>
              <Text style={styles.emptyStateTitle}>No weather data available</Text>
              <Text style={styles.emptyStateText}>
                We couldn't find temperature or UV information for this location
                right now.
              </Text>
            </Card>
          )}
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
  detailCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
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
  locationLine: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  temperatureValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  readingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  readingCard: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  readingLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  readingValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  uvRecommendation: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    lineHeight: 20,
  },
  forecastSection: {
    marginBottom: spacing.xl,
  },
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  forecastItem: {
    flexBasis: '47%',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  forecastDay: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: 2,
  },
  forecastRange: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
  },
  emptyStateTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
});

export default WeatherModal;

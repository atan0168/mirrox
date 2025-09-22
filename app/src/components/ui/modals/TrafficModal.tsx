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
import { colors, spacing, fontSize } from '../../../theme';
import { getTrafficDisplay } from '../display/traffic';

interface TrafficData {
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  trafficData?: TrafficData | null;
  isError?: boolean;
  errorMessage?: string;
  color?: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const TrafficModal: React.FC<Props> = ({
  visible,
  onClose,
  trafficData,
  isError = false,
  errorMessage = 'Unable to load traffic data',
  color = colors.neutral[400],
  locationLabel,
  latitude,
  longitude,
}) => {
  const { description, level } = getTrafficDisplay(
    trafficData ?? null,
    isError
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Traffic Conditions</Text>
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
                  Failed to Load Traffic Data
                </Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check your connection and try again
                </Text>
              </View>
            </Card>
          ) : trafficData ? (
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
                <View style={styles.trafficHeader}>
                  <Text style={styles.trafficTitle}>Current Conditions</Text>
                  <Text style={[styles.trafficLevel, { color }]}>
                    {level.toUpperCase()}
                  </Text>
                </View>
                {description ? (
                  <Text style={styles.trafficDescription}>{description}</Text>
                ) : null}
              </Card>

              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Traffic Metrics</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Congestion Factor</Text>
                    <Text style={[styles.metricValue, { color }]}>
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
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
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
    borderRadius: 8,
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
  locationLine: {
    fontSize: fontSize.xs,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
});

export default TrafficModal;

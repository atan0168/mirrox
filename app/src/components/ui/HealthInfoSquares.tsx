import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Activity, Moon, AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { HealthSnapshot } from '../../models/Health';

interface HealthInfoSquaresProps {
  health?: HealthSnapshot | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  dailyStepGoal?: number;
}

export const HealthInfoSquares: React.FC<HealthInfoSquaresProps> = ({
  health,
  isLoading = false,
  isError = false,
  errorMessage = 'Unable to load health data',
  dailyStepGoal = 10000,
}) => {
  const [selectedModal, setSelectedModal] = useState<'steps' | 'sleep' | null>(null);

  const steps = health?.steps ?? 0;
  const sleepMinutes = health?.sleepMinutes ?? 0;
  const sleepHours = sleepMinutes / 60;

  const getStepsColor = () => {
    if (isError) return colors.red[500];
    if (!health) return colors.neutral[400];
    const ratio = steps / dailyStepGoal;
    if (ratio >= 1) return colors.green[500];
    if (ratio >= 0.8) return colors.green[400];
    if (ratio >= 0.4) return colors.yellow[500];
    if (ratio > 0) return colors.orange[600];
    return colors.neutral[400];
  };

  const getStepsIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    const color = getStepsColor();
    const ratio = steps / dailyStepGoal;
    if (ratio >= 1) return <CheckCircle size={24} color={color} />;
    if (ratio >= 0.4) return <Activity size={24} color={color} />;
    return <AlertCircle size={24} color={color} />;
  };

  const getSleepColor = () => {
    if (isError) return colors.red[500];
    if (!health) return colors.neutral[400];
    if (sleepHours >= 7 && sleepHours <= 9) return colors.green[500];
    if (sleepHours >= 6 && sleepHours < 7) return colors.yellow[500];
    if (sleepHours >= 5 && sleepHours < 6) return colors.orange[600];
    if (sleepHours > 0 && sleepHours < 5) return colors.red[500];
    return colors.neutral[400];
  };

  const getSleepIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    const color = getSleepColor();
    if (sleepHours >= 7 && sleepHours <= 9) return <CheckCircle size={24} color={color} />;
    if (sleepHours >= 6) return <AlertCircle size={24} color={color} />;
    if (sleepHours > 0) return <XCircle size={24} color={color} />;
    return <Moon size={24} color={color} />;
  };

  const stepsLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (!health) return 'N/A';
    const ratio = steps / dailyStepGoal;
    if (ratio >= 1) return 'Goal met';
    if (ratio >= 0.8) return 'Almost there';
    if (ratio >= 0.4) return 'Keep going';
    if (ratio > 0) return 'Just started';
    return 'No steps yet';
  };

  const sleepLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (!health) return 'N/A';
    if (sleepHours >= 7 && sleepHours <= 9) return 'Well rested';
    if (sleepHours >= 6 && sleepHours < 7) return 'Adequate';
    if (sleepHours >= 5 && sleepHours < 6) return 'Tired';
    if (sleepHours > 0) return 'Sleep-deprived';
    return 'No data';
  };

  const renderStepsModal = () => (
    <Modal
      visible={selectedModal === 'steps'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Steps Today</Text>
          <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          {isError ? (
            <Card variant="outline" style={{ ...styles.detailCard, borderColor: colors.red[500] }}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Failed to Load Health Data</Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>Please check permissions and try again</Text>
              </View>
            </Card>
          ) : (
            <>
              <Card variant="outline" style={{ ...styles.detailCard, borderColor: getStepsColor() }}>
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Steps</Text>
                  <Text style={[styles.aqiValue, { color: getStepsColor() }]}>{steps}</Text>
                </View>
                <Text style={[styles.aqiClassification, { color: getStepsColor() }]}>{stepsLabel()}</Text>
                {health?.timestamp && (
                  <Text style={styles.timestamp}>Updated {new Date(health.timestamp).toLocaleTimeString()}</Text>
                )}
              </Card>
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Daily Goal</Text>
                    <Text style={styles.metricValue}>{dailyStepGoal}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Remaining</Text>
                    <Text style={styles.metricValue}>{Math.max(0, dailyStepGoal - steps)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Progress</Text>
                    <Text style={styles.metricValue}>{Math.min(100, Math.round((steps / dailyStepGoal) * 100))}%</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Source</Text>
                    <Text style={styles.metricValue}>{health?.platform?.toUpperCase() || 'UNKNOWN'}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
        <View style={styles.modalFooter}>
          <Button variant="secondary" onPress={() => setSelectedModal(null)} fullWidth>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderSleepModal = () => (
    <Modal
      visible={selectedModal === 'sleep'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedModal(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Last Night's Sleep</Text>
          <TouchableOpacity onPress={() => setSelectedModal(null)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          {isError ? (
            <Card variant="outline" style={{ ...styles.detailCard, borderColor: colors.red[500] }}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Failed to Load Health Data</Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>Please check permissions and try again</Text>
              </View>
            </Card>
          ) : (
            <>
              <Card variant="outline" style={{ ...styles.detailCard, borderColor: getSleepColor() }}>
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>Sleep</Text>
                  <Text style={[styles.aqiValue, { color: getSleepColor() }]}>{sleepHours.toFixed(1)}h</Text>
                </View>
                <Text style={[styles.aqiClassification, { color: getSleepColor() }]}>{sleepLabel()}</Text>
                {health?.timestamp && (
                  <Text style={styles.timestamp}>Updated {new Date(health.timestamp).toLocaleTimeString()}</Text>
                )}
              </Card>
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{Math.round(sleepMinutes)} min</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Recommended</Text>
                    <Text style={styles.metricValue}>7–9 hours</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Quality</Text>
                    <Text style={styles.metricValue}>{sleepLabel()}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Source</Text>
                    <Text style={styles.metricValue}>{health?.platform?.toUpperCase() || 'UNKNOWN'}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
        <View style={styles.modalFooter}>
          <Button variant="secondary" onPress={() => setSelectedModal(null)} fullWidth>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Overview</Text>
      <View style={styles.squaresGrid}>
        {/* Steps Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getStepsColor() }]}
          onPress={() => setSelectedModal('steps')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getStepsIcon()}</View>
          <Text style={styles.squareValue}>
            {isError ? 'Error' : isLoading ? '...' : steps}
          </Text>
          <Text style={styles.squareLabel}>Steps</Text>
          <Text style={[styles.squareStatus, { color: getStepsColor() }]}>{stepsLabel()}</Text>
        </TouchableOpacity>

        {/* Sleep Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getSleepColor() }]}
          onPress={() => setSelectedModal('sleep')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getSleepIcon()}</View>
          <Text style={styles.squareValue}>
            {isError ? 'Error' : isLoading ? '...' : `${sleepHours.toFixed(1)}h`}
          </Text>
          <Text style={styles.squareLabel}>Sleep</Text>
          <Text style={[styles.squareStatus, { color: getSleepColor() }]}>{sleepLabel()}</Text>
        </TouchableOpacity>
      </View>

      {renderStepsModal()}
      {renderSleepModal()}
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
    textTransform: 'none',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
  },
  metricsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
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


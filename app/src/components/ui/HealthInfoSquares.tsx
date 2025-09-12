import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  Activity,
  Moon,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  HeartPulse,
  Heart,
  Flame,
  Wind,
  Dumbbell,
  Brain,
} from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { HealthSnapshot } from '../../models/Health';
import HistoryBarChart from './HistoryBarChart';
import SleepStackedBarChart from './SleepStackedBarChart';
import SleepTimesTrendChart from './SleepTimesTrendChart';
import { useHealthHistory } from '../../hooks/useHealthHistory';
import { format, parseISO } from 'date-fns';

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
  const [selectedModal, setSelectedModal] = useState<
    | 'steps'
    | 'sleep'
    | 'hrv'
    | 'rhr'
    | 'energy'
    | 'respiratory'
    | 'workouts'
    | 'mindfulness'
    | null
  >(null);

  const steps = health?.steps ?? 0;
  const sleepMinutes = health?.sleepMinutes ?? 0;
  const sleepHours = sleepMinutes / 60;
  const hrvMs = health?.hrvMs ?? null;
  const restingHeartRateBpm = health?.restingHeartRateBpm ?? null;
  const activeEnergyKcal = health?.activeEnergyKcal ?? null;
  const mindfulMinutes = health?.mindfulMinutes ?? null;
  const respiratoryRateBrpm = health?.respiratoryRateBrpm ?? null;
  const workoutsCount = health?.workoutsCount ?? null;
  const isAndroid = Platform.OS === 'android';

  // Steps history state (for steps modal chart)
  const [stepsHistoryWindow, setStepsHistoryWindow] = useState<7 | 14 | 30>(7);
  const {
    data: stepsHistory,
    loading: isStepsHistoryLoading,
    error: stepsHistoryError,
  } = useHealthHistory(stepsHistoryWindow);

  // Sleep history state (for sleep modal chart)
  const [sleepHistoryWindow, setSleepHistoryWindow] = useState<7 | 14 | 30>(7);
  const [sleepChartType, setSleepChartType] = useState<'stages' | 'bedwake'>(
    'stages'
  );
  const {
    data: sleepHistory,
    loading: isSleepHistoryLoading,
    error: sleepHistoryError,
  } = useHealthHistory(sleepHistoryWindow);

  const StepsHistoryToggle: React.FC = () => (
    <View style={{ flexDirection: 'row' }}>
      {[7, 14, 30].map(n => {
        const active = n === stepsHistoryWindow;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => setStepsHistoryWindow(n as 7 | 14 | 30)}
            style={active ? styles.historyToggleActive : styles.historyToggle}
          >
            <Text
              style={
                active
                  ? styles.historyToggleTextActive
                  : styles.historyToggleText
              }
            >
              {n}d
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const StepsHistoryChart: React.FC = () => (
    <>
      <HistoryBarChart
        data={(stepsHistory?.snapshots || []).map(s => ({
          label: format(parseISO(s.date), 'MM/dd'),
          value: s.steps,
        }))}
        height={180}
        barColor={colors.green[600]}
        showValueOnPress
      />
      <Text style={styles.timestamp}>
        {isStepsHistoryLoading
          ? 'Loading history…'
          : stepsHistoryError
            ? 'Unable to load history'
            : `Showing last ${stepsHistoryWindow} days`}
      </Text>
    </>
  );

  const SleepHistoryToggle: React.FC = () => (
    <View style={{ flexDirection: 'row' }}>
      {[7, 14, 30].map(n => {
        const active = n === sleepHistoryWindow;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => setSleepHistoryWindow(n as 7 | 14 | 30)}
            style={active ? styles.historyToggleActive : styles.historyToggle}
          >
            <Text
              style={
                active
                  ? styles.historyToggleTextActive
                  : styles.historyToggleText
              }
            >
              {n}d
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Sleep stacked chart (with stages or fallback total)
  const SleepStackedHistoryChart: React.FC = () => (
    <>
      <SleepStackedBarChart
        data={(sleepHistory?.snapshots || []).map(s => ({
          label: format(parseISO(s.date), 'MM/dd'),
          totalMinutes: s.sleepMinutes ?? 0,
          lightMinutes: s.sleepLightMinutes ?? 0,
          remMinutes: s.sleepRemMinutes ?? 0,
          deepMinutes: s.sleepDeepMinutes ?? 0,
        }))}
        height={200}
        showValueOnPress
      />
      <Text style={styles.timestamp}>
        {isSleepHistoryLoading
          ? 'Loading history…'
          : sleepHistoryError
            ? 'Unable to load history'
            : `Showing last ${sleepHistoryWindow} days`}
      </Text>
    </>
  );

  const SleepBedWakeTrendChart: React.FC = () => (
    <>
      <SleepTimesTrendChart
        data={(sleepHistory?.snapshots || []).map(s => ({
          label: format(parseISO(s.date), 'MM/dd'),
          sleepStart: s.sleepStart ?? null,
          sleepEnd: s.sleepEnd ?? null,
        }))}
        height={200}
      />
      <Text style={styles.timestamp}>
        {isSleepHistoryLoading
          ? 'Loading history…'
          : sleepHistoryError
            ? 'Unable to load history'
            : `Showing last ${sleepHistoryWindow} days`}
      </Text>
    </>
  );

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
    if (sleepHours >= 7 && sleepHours <= 9)
      return <CheckCircle size={24} color={color} />;
    if (sleepHours >= 6) return <AlertCircle size={24} color={color} />;
    if (sleepHours > 0) return <XCircle size={24} color={color} />;
    return <Moon size={24} color={color} />;
  };

  const stepsLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (!health) return 'No data';
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
    if (!health) return 'No data';
    if (sleepHours >= 7 && sleepHours <= 9) return 'Well rested';
    if (sleepHours >= 6 && sleepHours < 7) return 'Adequate';
    if (sleepHours >= 5 && sleepHours < 6) return 'Tired';
    if (sleepHours > 0) return 'Sleep-deprived';
    return 'No data';
  };

  // HRV helpers
  const getHRVColor = () => {
    if (isError) return colors.red[500];
    if (hrvMs == null) return colors.neutral[400];
    if (hrvMs >= 60) return colors.green[500];
    if (hrvMs >= 40) return colors.green[400];
    if (hrvMs >= 20) return colors.orange[600];
    if (hrvMs > 0) return colors.red[500];
    return colors.neutral[400];
  };
  const getHRVIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <HeartPulse size={24} color={getHRVColor()} />;
  };
  const hrvLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (hrvMs == null) return 'No data';
    if (hrvMs >= 60) return 'Excellent';
    if (hrvMs >= 40) return 'Good';
    if (hrvMs >= 20) return 'Low';
    if (hrvMs > 0) return 'Very low';
    return 'No data';
  };

  // Resting HR helpers
  const getRHRColor = () => {
    if (isError) return colors.red[500];
    if (restingHeartRateBpm == null) return colors.neutral[400];
    if (restingHeartRateBpm < 60) return colors.green[500];
    if (restingHeartRateBpm < 70) return colors.green[400];
    if (restingHeartRateBpm < 80) return colors.orange[600];
    return colors.red[500];
  };
  const getRHRIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <Heart size={24} color={getRHRColor()} />;
  };
  const rhrLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (restingHeartRateBpm == null) return 'No data';
    if (restingHeartRateBpm < 60) return 'Great';
    if (restingHeartRateBpm < 70) return 'Good';
    if (restingHeartRateBpm < 80) return 'High';
    return 'Very high';
  };

  // Active Energy helpers
  const getEnergyColor = () => {
    if (isError) return colors.red[500];
    if (activeEnergyKcal == null) return colors.neutral[400];
    if (activeEnergyKcal >= 500) return colors.green[500];
    if (activeEnergyKcal >= 300) return colors.green[400];
    if (activeEnergyKcal >= 100) return colors.orange[600];
    if (activeEnergyKcal > 0) return colors.neutral[500];
    return colors.neutral[400];
  };
  const getEnergyIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <Flame size={24} color={getEnergyColor()} />;
  };
  const energyLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (activeEnergyKcal == null) return 'No data';
    if (activeEnergyKcal >= 500) return 'Very active';
    if (activeEnergyKcal >= 300) return 'Active';
    if (activeEnergyKcal >= 100) return 'Lightly active';
    if (activeEnergyKcal > 0) return 'Minimal';
    return 'No activity';
  };

  // Respiratory Rate helpers
  const getRRColor = () => {
    if (isError) return colors.red[500];
    if (respiratoryRateBrpm == null) return colors.neutral[400];
    if (respiratoryRateBrpm >= 12 && respiratoryRateBrpm <= 20)
      return colors.green[500];
    if (
      (respiratoryRateBrpm > 20 && respiratoryRateBrpm <= 22) ||
      (respiratoryRateBrpm >= 10 && respiratoryRateBrpm < 12)
    )
      return colors.orange[600];
    return colors.red[500];
  };
  const getRRIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <Wind size={24} color={getRRColor()} />;
  };
  const rrLabel = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (respiratoryRateBrpm == null) return 'No data';
    if (respiratoryRateBrpm >= 12 && respiratoryRateBrpm <= 20) return 'Normal';
    if (
      (respiratoryRateBrpm > 20 && respiratoryRateBrpm <= 22) ||
      (respiratoryRateBrpm >= 10 && respiratoryRateBrpm < 12)
    )
      return 'Slightly off';
    return 'Out of range';
  };

  // Workouts helpers
  const getWorkoutsColor = () => {
    if (isError) return colors.red[500];
    if (workoutsCount == null) return colors.neutral[400];
    if (workoutsCount >= 2) return colors.green[500];
    if (workoutsCount >= 1) return colors.green[400];
    return colors.neutral[400];
  };
  const getWorkoutsIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <Dumbbell size={24} color={getWorkoutsColor()} />;
  };
  const workoutsLabelText = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (workoutsCount == null) return 'No data';
    if (workoutsCount >= 2) return 'Active';
    if (workoutsCount === 1) return '1 session';
    return 'None';
  };

  // Mindfulness helpers (iOS only display)
  const getMindfulColor = () => {
    if (isError) return colors.red[500];
    if (mindfulMinutes == null) return colors.neutral[400];
    if (mindfulMinutes >= 10) return colors.green[500];
    if (mindfulMinutes >= 5) return colors.green[400];
    if (mindfulMinutes > 0) return colors.orange[600];
    return colors.neutral[400];
  };
  const getMindfulIcon = () => {
    if (isError) return <AlertTriangle size={24} color={colors.red[500]} />;
    return <Brain size={24} color={getMindfulColor()} />;
  };
  const mindfulLabelText = () => {
    if (isError) return 'Error';
    if (isLoading) return '...';
    if (mindfulMinutes == null) return 'No dta';
    if (mindfulMinutes >= 10) return 'Great';
    if (mindfulMinutes >= 5) return 'Good';
    if (mindfulMinutes > 0) return 'A little';
    return 'None';
  };

  // Shared modal renderer for maintainability
  const renderMetricModal = (
    key:
      | 'steps'
      | 'sleep'
      | 'hrv'
      | 'rhr'
      | 'energy'
      | 'respiratory'
      | 'workouts'
      | 'mindfulness',
    options: {
      title: string;
      valueText: string;
      color: string;
      statusText: string;
      presentationStyle?: 'pageSheet' | 'formSheet' | 'fullScreen';
      summary: Array<{ label: string; value: string }>;
      extra?: React.ReactNode;
    }
  ) => (
    <Modal
      visible={selectedModal === key}
      animationType="slide"
      presentationStyle={options.presentationStyle || 'fullScreen'}
      onRequestClose={() => setSelectedModal(null)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{options.title}</Text>
          <TouchableOpacity
            onPress={() => setSelectedModal(null)}
            style={styles.closeButton}
          >
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
                  Failed to Load Health Data
                </Text>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
                <Text style={styles.errorSubtext}>
                  Please check permissions and try again
                </Text>
              </View>
            </Card>
          ) : (
            <>
              <Card
                variant="outline"
                style={{ ...styles.detailCard, borderColor: options.color }}
              >
                <View style={styles.aqiHeader}>
                  <Text style={styles.aqiTitle}>{options.title}</Text>
                  <Text style={[styles.aqiValue, { color: options.color }]}>
                    {options.valueText}
                  </Text>
                </View>
                <Text
                  style={[styles.aqiClassification, { color: options.color }]}
                >
                  {options.statusText}
                </Text>
                {health?.timestamp && (
                  <Text style={styles.timestamp}>
                    Updated {new Date(health.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </Card>
              {options.extra}
              {options.summary.length > 0 && (
                <View style={styles.metricsSection}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <View style={styles.metricGrid}>
                    {options.summary.map((m, idx) => (
                      <View key={idx} style={styles.metricItem}>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                        <Text style={styles.metricValue}>{m.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
      </SafeAreaView>
    </Modal>
  );

  const renderStepsModal = () =>
    renderMetricModal('steps', {
      title: 'Steps Today',
      valueText: isError ? 'Error' : isLoading ? '...' : `${steps}`,
      color: getStepsColor(),
      statusText: stepsLabel(),
      extra: (
        <View style={styles.metricsSection}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={styles.sectionTitle}>History</Text>
            <StepsHistoryToggle />
          </View>
          <Card>
            <View style={{ paddingVertical: spacing.sm }}>
              <StepsHistoryChart />
            </View>
          </Card>
        </View>
      ),
      summary: [
        { label: 'Daily Goal', value: `${dailyStepGoal}` },
        { label: 'Remaining', value: `${Math.max(0, dailyStepGoal - steps)}` },
        {
          label: 'Progress',
          value: `${Math.min(100, Math.round((steps / dailyStepGoal) * 100))}%`,
        },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderSleepModal = () =>
    renderMetricModal('sleep', {
      title: "Last Night's Sleep",
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : sleepMinutes > 0
            ? `${sleepHours.toFixed(1)}h`
            : 'N/A',
      color: getSleepColor(),
      statusText: sleepLabel(),
      extra: (
        <View style={styles.metricsSection}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={styles.sectionTitle}>History</Text>
            <SleepHistoryToggle />
          </View>
          <Card>
            <View style={{ paddingVertical: spacing.sm }}>
              {sleepChartType === 'stages' ? (
                <SleepStackedHistoryChart />
              ) : (
                <SleepBedWakeTrendChart />
              )}
            </View>
          </Card>
          {/* Chart type toggle below the chart */}
          <View style={{ alignSelf: 'flex-end', marginTop: spacing.xs }}>
            <View style={{ flexDirection: 'row' }}>
              {(
                [
                  { key: 'stages', label: 'Stages' },
                  { key: 'bedwake', label: 'Bed/Wake' },
                ] as const
              ).map(opt => {
                const active = sleepChartType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSleepChartType(opt.key)}
                    style={
                      active ? styles.historyToggleActive : styles.historyToggle
                    }
                  >
                    <Text
                      style={
                        active
                          ? styles.historyToggleTextActive
                          : styles.historyToggleText
                      }
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ),
      summary: [
        {
          label: 'Duration',
          value:
            sleepMinutes > 0 ? `${Math.round(sleepMinutes)} min` : 'No data',
        },
        { label: 'Recommended', value: '7–9 hours' },
        { label: 'Quality', value: sleepLabel() },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  // Newly added modals using the shared renderer
  const renderHRVModal = () =>
    renderMetricModal('hrv', {
      title: 'Heart Rate Variability',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : hrvMs != null
            ? `${hrvMs} ms`
            : 'N/A',
      color: getHRVColor(),
      statusText: hrvLabel(),
      summary: [
        { label: 'Status', value: hrvLabel() },
        { label: 'Typical Range', value: '20–60 ms' },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderRHRModal = () =>
    renderMetricModal('rhr', {
      title: 'Resting Heart Rate',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : restingHeartRateBpm != null
            ? `${restingHeartRateBpm} bpm`
            : 'N/A',
      color: getRHRColor(),
      statusText: rhrLabel(),
      summary: [
        { label: 'Status', value: rhrLabel() },
        { label: 'Typical Range', value: '60–80 bpm' },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderEnergyModal = () =>
    renderMetricModal('energy', {
      title: 'Active Energy',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : activeEnergyKcal != null
            ? `${activeEnergyKcal} kcal`
            : 'N/A',
      color: getEnergyColor(),
      statusText: energyLabel(),
      summary: [
        { label: 'Status', value: energyLabel() },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderRespiratoryModal = () =>
    renderMetricModal('respiratory', {
      title: 'Respiratory Rate',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : respiratoryRateBrpm != null
            ? `${respiratoryRateBrpm} brpm`
            : 'N/A',
      color: getRRColor(),
      statusText: rrLabel(),
      summary: [
        { label: 'Status', value: rrLabel() },
        { label: 'Normal Range', value: '12–20 brpm' },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderWorkoutsModal = () =>
    renderMetricModal('workouts', {
      title: 'Workouts',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : workoutsCount != null
            ? `${workoutsCount}`
            : 'N/A',
      color: getWorkoutsColor(),
      statusText: workoutsLabelText(),
      summary: [
        { label: 'Status', value: workoutsLabelText() },
        {
          label: 'Sessions',
          value: workoutsCount != null ? `${workoutsCount}` : 'No data',
        },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

  const renderMindfulnessModal = () =>
    renderMetricModal('mindfulness', {
      title: 'Mindful Minutes',
      valueText:
        isError || isLoading
          ? isError
            ? 'Error'
            : '...'
          : mindfulMinutes != null
            ? `${mindfulMinutes} min`
            : 'No data',
      color: getMindfulColor(),
      statusText: mindfulLabelText(),
      summary: [
        { label: 'Status', value: mindfulLabelText() },
        {
          label: 'Minutes',
          value: mindfulMinutes != null ? `${mindfulMinutes} min` : 'No data',
        },
        {
          label: 'Source',
          value: health?.platform?.toUpperCase() || 'UNKNOWN',
        },
      ],
    });

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
          <Text style={[styles.squareStatus, { color: getStepsColor() }]}>
            {stepsLabel()}
          </Text>
        </TouchableOpacity>

        {/* Sleep Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getSleepColor() }]}
          onPress={() => setSelectedModal('sleep')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getSleepIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : sleepMinutes > 0
                  ? `${sleepHours.toFixed(1)}h`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Sleep</Text>
          <Text style={[styles.squareStatus, { color: getSleepColor() }]}>
            {sleepLabel()}
          </Text>
        </TouchableOpacity>

        {/* HRV Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getHRVColor() }]}
          onPress={() => setSelectedModal('hrv')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getHRVIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : hrvMs != null
                  ? `${hrvMs} ms`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>HRV</Text>
          <Text style={[styles.squareStatus, { color: getHRVColor() }]}>
            {hrvLabel()}
          </Text>
        </TouchableOpacity>

        {/* Resting HR Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getRHRColor() }]}
          onPress={() => setSelectedModal('rhr')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getRHRIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : restingHeartRateBpm != null
                  ? `${restingHeartRateBpm} bpm`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Resting HR</Text>
          <Text style={[styles.squareStatus, { color: getRHRColor() }]}>
            {rhrLabel()}
          </Text>
        </TouchableOpacity>

        {/* Active Energy Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getEnergyColor() }]}
          onPress={() => setSelectedModal('energy')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getEnergyIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : activeEnergyKcal != null
                  ? `${activeEnergyKcal} kcal`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Active Energy</Text>
          <Text style={[styles.squareStatus, { color: getEnergyColor() }]}>
            {energyLabel()}
          </Text>
        </TouchableOpacity>

        {/* Respiratory Rate Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getRRColor() }]}
          onPress={() => setSelectedModal('respiratory')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getRRIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : respiratoryRateBrpm != null
                  ? `${respiratoryRateBrpm} brpm`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Respiratory</Text>
          <Text style={[styles.squareStatus, { color: getRRColor() }]}>
            {rrLabel()}
          </Text>
        </TouchableOpacity>

        {/* Workouts Square */}
        <TouchableOpacity
          style={[styles.square, { borderColor: getWorkoutsColor() }]}
          onPress={() => setSelectedModal('workouts')}
          disabled={isLoading || isError}
        >
          <View style={styles.squareIcon}>{getWorkoutsIcon()}</View>
          <Text style={styles.squareValue}>
            {isError
              ? 'Error'
              : isLoading
                ? '...'
                : workoutsCount != null
                  ? `${workoutsCount}`
                  : 'N/A'}
          </Text>
          <Text style={styles.squareLabel}>Workouts</Text>
          <Text style={[styles.squareStatus, { color: getWorkoutsColor() }]}>
            {workoutsLabelText()}
          </Text>
        </TouchableOpacity>

        {/* Mindful Minutes Square (hide on Android) */}
        {!isAndroid && (
          <TouchableOpacity
            style={[styles.square, { borderColor: getMindfulColor() }]}
            onPress={() => setSelectedModal('mindfulness')}
            disabled={isLoading || isError}
          >
            <View style={styles.squareIcon}>{getMindfulIcon()}</View>
            <Text style={styles.squareValue}>
              {isError
                ? 'Error'
                : isLoading
                  ? '...'
                  : mindfulMinutes != null
                    ? `${mindfulMinutes} min`
                    : 'N/A'}
            </Text>
            <Text style={styles.squareLabel}>Mindfulness</Text>
            <Text style={[styles.squareStatus, { color: getMindfulColor() }]}>
              {mindfulLabelText()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderStepsModal()}
      {renderSleepModal()}
      {renderHRVModal()}
      {renderRHRModal()}
      {renderEnergyModal()}
      {renderRespiratoryModal()}
      {renderWorkoutsModal()}
      {!isAndroid && renderMindfulnessModal()}
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
    flexWrap: 'wrap',
    marginHorizontal: spacing.md,
    gap: spacing.md,
  },
  square: {
    width: '47%',
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
  historyToggle: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    marginLeft: spacing.xs,
  },
  historyToggleActive: {
    borderWidth: 1,
    borderColor: colors.green[600],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green[50],
    marginLeft: spacing.xs,
  },
  historyToggleText: {
    fontSize: fontSize.xs,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  historyToggleTextActive: {
    fontSize: fontSize.xs,
    color: colors.green[700],
    fontWeight: '700',
  },
});

import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Heart,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
  Lightbulb,
  Info,
} from 'lucide-react-native';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  lineHeight,
} from '../../theme';
import { Card } from './Card';
import { Button } from './Button';

interface StressInfoModalProps {
  visible: boolean;
  onClose: () => void;
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  hrvMs: number | null;
  baselineHrvMs: number | null;
  restingHeartRateBpm: number | null;
  baselineRestingHeartRateBpm: number | null;
  reasons: string[];
}

export function StressInfoModal({
  visible,
  onClose,
  stressLevel,
  hrvMs,
  baselineHrvMs,
  restingHeartRateBpm,
  baselineRestingHeartRateBpm,
  reasons,
}: StressInfoModalProps) {
  const getStressInfo = () => {
    switch (stressLevel) {
      case 'mild':
        return {
          title: 'Mild Stress Detected',
          icon: Heart,
          description:
            'HRV is showing a light sympathetic response compared with your usual baseline.',
          defaultReasons: [
            'Slight reduction in HRV vs baseline',
            'Minor sleep disruption or fatigue',
            'Everyday life stressors',
          ],
          recommendations: [
            'Practice 2–3 minutes of slow breathing',
            'Take a gentle movement or stretch break',
            'Stay hydrated through the day',
            'Schedule a short pause between tasks',
          ],
          color: colors.neutral[600],
          backgroundColor: colors.neutral[100],
        } as const;
      case 'moderate':
        return {
          title: 'Moderate Stress Detected',
          icon: AlertTriangle,
          description:
            'Your nervous system is working harder today based on HRV and recovery signals.',
          defaultReasons: [
            'HRV is notably below your baseline',
            'Short or fragmented sleep recently',
            'Resting heart rate trending higher than normal',
            'Limited recovery or mindfulness time',
          ],
          recommendations: [
            'Spend 5–10 minutes with guided breathing or mindfulness',
            'Prioritise a lighter schedule or screen breaks',
            'Aim for an earlier, consistent bedtime tonight',
            'Consider a light outdoor walk if it feels good',
          ],
          color: colors.neutral[800],
          backgroundColor: colors.warning,
        } as const;
      case 'high':
        return {
          title: 'High Stress Alert',
          icon: AlertCircle,
          description:
            'HRV indicates a strong stress response. Give yourself space to recover and recharge.',
          defaultReasons: [
            'Large HRV drop vs personal baseline',
            'Resting heart rate significantly elevated',
            'Very limited restorative sleep or downtime',
            'Body still recovering from recent load',
          ],
          recommendations: [
            'Block time for deep rest or mindfulness',
            'Keep physical activity light and restorative',
            'Reduce high-pressure tasks if possible',
            'Connect with supportive people or calming music',
            'Hydrate regularly and fuel with balanced meals',
            'Seek professional support if stress feels overwhelming',
          ],
          color: colors.neutral[100],
          backgroundColor: colors.error,
        } as const;
      default:
        return {
          title: 'No Stress Detected',
          icon: CheckCircle,
          description:
            'HRV and resting heart rate look stable compared with your usual patterns.',
          defaultReasons: [
            'HRV aligns with your baseline',
            'Resting heart rate looks steady',
            'Recent recovery habits are supporting balance',
          ],
          recommendations: [
            'Keep up the routines that work for you',
            'Great moment for focused work or movement',
          ],
          color: colors.neutral[600],
          backgroundColor: colors.neutral[50],
        } as const;
    }
  };

  const stressInfo = getStressInfo();
  const IconComponent = stressInfo.icon;
  const reasonList =
    reasons && reasons.length > 0 ? reasons : stressInfo.defaultReasons;

  const formatMs = (value: number | null) =>
    value != null ? `${Math.round(value)} ms` : '—';
  const formatBpm = (value: number | null) =>
    value != null ? `${Math.round(value)} bpm` : '—';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card variant="elevated" padding="none" style={styles.modalContainer}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { backgroundColor: stressInfo.backgroundColor },
              ]}
            >
              <IconComponent
                size={32}
                color={stressInfo.color}
                style={styles.headerIcon}
              />
              <Text style={[styles.headerTitle, { color: stressInfo.color }]}>
                {stressInfo.title}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.description}>{stressInfo.description}</Text>
            </View>

            {/* Key metrics */}
            <View style={styles.section}>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>HRV Today</Text>
                  <Text style={styles.metricValue}>{formatMs(hrvMs)}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Baseline HRV</Text>
                  <Text style={styles.metricValue}>{formatMs(baselineHrvMs)}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Resting HR</Text>
                  <Text style={styles.metricValue}>
                    {formatBpm(restingHeartRateBpm)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Baseline Resting HR</Text>
                  <Text style={styles.metricValue}>
                    {formatBpm(baselineRestingHeartRateBpm)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Causes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Activity size={18} color={colors.neutral[600]} />
                <Text style={styles.sectionTitle}>Contributing Factors</Text>
              </View>
              {reasonList.map((cause, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{cause}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Lightbulb size={18} color={colors.neutral[600]} />
                <Text style={styles.sectionTitle}>Recommendations</Text>
              </View>
              {stressInfo.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{recommendation}</Text>
                </View>
              ))}
            </View>

            {/* Additional Info */}
            <View style={styles.section}>
              <View style={styles.infoContainer}>
                <Info size={16} color={colors.neutral[400]} />
                <Text style={styles.infoText}>
                  These stress insights interpret your heart rate variability,
                  resting heart rate, sleep, and mindfulness signals relative to
                  your personal baseline. They are for general wellness
                  guidance only and are not a substitute for professional
                  medical advice.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <Button onPress={onClose} variant="secondary" fullWidth>
              Got it!
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.darker,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },
  scrollView: {
    maxHeight: 500,
  },
  header: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: lineHeight.tight * fontSize.xl,
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: lineHeight.normal * fontSize.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginLeft: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[400],
    marginRight: spacing.md,
    marginTop: 6,
  },
  listText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    flex: 1,
    lineHeight: lineHeight.normal * fontSize.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.base,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    fontStyle: 'italic',
    lineHeight: lineHeight.normal * fontSize.xs,
    marginLeft: spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
});

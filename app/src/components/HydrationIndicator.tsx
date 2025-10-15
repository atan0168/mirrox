import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Droplet, Droplets, X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { clamp } from '../utils/mathUtils';
import { useHydrationStore } from '../store/hydrationStore';
import { HydrationTracker } from './ui/HydrationTracker';
import { borderRadius, colors, fontSize, spacing } from '../theme';

const clampProgress = (value: number) => clamp(value, 0, 200);

const getProgressColor = (progress: number) => {
  if (progress < 25) return colors.red[500];
  if (progress < 50) return colors.orange[500];
  if (progress < 75) return colors.yellow[500];
  if (progress <= 100) return colors.green[500];
  return colors.teal[500];
};

export const HydrationIndicator: React.FC = () => {
  const { getProgressPercentage } = useHydrationStore();
  const [isVisible, setIsVisible] = useState(false);

  const progress = clampProgress(getProgressPercentage());
  const displayProgress = Math.round(progress);
  const progressColor = useMemo(() => getProgressColor(progress), [progress]);

  const circleSize = 36;
  const strokeWidth = 3;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <Pressable
        onPress={() => setIsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Hydration level ${displayProgress} percent`}
        accessibilityHint="Opens hydration details and quick add actions"
        style={({ pressed }) => [
          styles.container,
          {
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Svg
            width={circleSize}
            height={circleSize}
            style={{ position: 'absolute' }}
          >
            <Circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke={colors.neutral[300]}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
            />
          </Svg>
          <Droplet size={16} color={colors.sky[400]} fill={colors.sky[400]} />
        </View>
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Droplets size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Hydration Details</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close hydration details"
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <X size={18} color={colors.neutral[500]} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <HydrationTracker style={styles.trackerCard} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 140,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  percentage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  detailText: {
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  trackerCard: {
    marginVertical: 0,
    gap: spacing.sm,
  },
});

export default HydrationIndicator;

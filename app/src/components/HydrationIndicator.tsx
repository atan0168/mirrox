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
  const { currentHydrationMl, dailyGoalMl, getProgressPercentage } =
    useHydrationStore();
  const [isVisible, setIsVisible] = useState(false);

  const progress = clampProgress(getProgressPercentage());
  const displayProgress = Math.round(progress);
  const progressColor = useMemo(() => getProgressColor(progress), [progress]);

  const currentAmount = Math.max(0, currentHydrationMl);
  const goalAmount = Math.max(dailyGoalMl, 1);

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
            borderColor: progressColor,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.iconContainer, { borderColor: colors.sky[400] }]}>
          <Droplet size={16} color={colors.sky[400]} fill={colors.sky[400]} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.percentage, { color: progressColor }]}>
            {displayProgress}%
          </Text>
          <Text style={styles.detailText}>
            {currentAmount.toLocaleString()} / {goalAmount.toLocaleString()} mL
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
  },
});

export default HydrationIndicator;

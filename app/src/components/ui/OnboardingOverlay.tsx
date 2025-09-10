import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Step = {
  title: string;
  bullets: string[];
  cta?: string;
};

interface OnboardingOverlayProps {
  visible: boolean;
  step: number; // 0-based index
  onNext: () => void;
  onSkip: () => void;
  onDone: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  step,
  onNext,
  onSkip,
  onDone,
}) => {
  const steps: Step[] = useMemo(
    () => [
      {
        title: 'Meet Your Digital Twin',
        bullets: [
          '3D avatar mirrors your environment and habits',
          'Scenes reflect your weather and location',
          'Health metrics influence look and animations',
        ],
        cta: 'Next',
      },
      {
        title: 'Stats Screen',
        bullets: [
          'Track air quality and traffic nearby',
          'View steps, sleep, and health summaries',
          'Pull down to refresh your data',
          'Watch trends evolve over time',
        ],
        cta: 'Next',
      },
      {
        title: 'Alerts & Settings',
        bullets: [
          'Tap the bell to view important alerts',
          'Adjust preferences and notifications in Settings',
        ],
        cta: 'Get started',
      },
    ],
    []
  );

  const last = step >= steps.length - 1;
  const current = steps[Math.max(0, Math.min(step, steps.length - 1))];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={last ? onDone : onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.stepText}>{`${step + 1}/${steps.length}`}</Text>
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <View style={styles.bullets}>
            {current.bullets.map((line, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            {!last ? (
              <TouchableOpacity style={styles.tertiary} onPress={onSkip}>
                <Text style={styles.tertiaryText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 88 }} />
            )}
            <TouchableOpacity
              style={styles.primary}
              onPress={last ? onDone : onNext}
            >
              <Text style={styles.primaryText}>{current.cta}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  stepText: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  title: {
    marginTop: spacing.sm,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  bullets: {
    marginTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    width: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.neutral[700],
    fontSize: fontSize.base,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 22,
  },
  ctaRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.base,
  },
  tertiary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tertiaryText: {
    color: colors.neutral[600],
    fontWeight: '600',
    fontSize: fontSize.base,
  },
});

export default OnboardingOverlay;

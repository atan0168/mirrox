import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  confirmLabel?: string;
};

export default function InfoPopover({
  visible,
  onClose,
  title,
  children,
  confirmLabel = 'Got it',
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Card */}
      <View style={styles.card}>
        {title ? <Text style={styles.title}>{title}</Text> : null}

        <View style={[styles.body, !title && { marginTop: 0 }]}>
          {children}
        </View>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
        >
          <Text style={styles.actionText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay.medium,
  },
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: '22%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.medium,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  body: {
    marginTop: spacing.xs,
  },
  actionBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.neutral[50],
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.neutral[900],
  },
});

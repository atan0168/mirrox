// app/src/components/InfoPopover.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';

// NEW: use design tokens from theme
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
  // CHANGED: use theme overlay color instead of raw rgba
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay.medium, // NEW
  },

  // CHANGED: replace hard-coded sizes/colors with tokens
  card: {
    position: 'absolute',
    left: spacing.md, // 16
    right: spacing.md, // 16
    top: '22%',
    backgroundColor: colors.white, // NEW
    borderRadius: borderRadius.xl, // 16
    padding: spacing.md, // 16
    borderWidth: 1,
    borderColor: colors.divider, // NEW
    ...shadows.medium, // NEW: unified shadow
  },

  // CHANGED: tokenized typography
  title: {
    fontSize: fontSize.base, // 16
    fontWeight: Platform.select({ ios: '700', android: '700' }),
    color: colors.neutral[900], // NEW
  },

  body: {
    marginTop: spacing.xs, // 4
  },

  // CHANGED: tokenized button styles
  actionBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm, // 8
    paddingVertical: spacing.sm, // 8
    paddingHorizontal: spacing.md, // 16
    borderRadius: borderRadius.lg, // 12
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.neutral[50], // subtle background from palette
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: fontSize.sm, // 14
    fontWeight: Platform.select({ ios: '700', android: '700' }),
    color: colors.neutral[900],
  },
});

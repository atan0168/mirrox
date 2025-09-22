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

type Props = {
  /** Whether the popover is visible */
  visible: boolean;
  /** Called when user dismisses the popover (backdrop or button) */
  onClose: () => void;
  /** Optional title shown at the top */
  title?: string;
  /** Main content of the popover (texts, links, etc.) */
  children: React.ReactNode;
  /** Optional: custom label for the confirm/close button (defaults to "Got it") */
  confirmLabel?: string;
};

/**
 * A lightweight modal popover for short help / info content.
 * - Taps on the backdrop close the popover.
 * - Keep content concise; for long documents prefer a separate screen.
 */
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
        {/* Title (optional) */}
        {title ? <Text style={styles.title}>{title}</Text> : null}

        {/* Body */}
        <View style={[styles.body, !title && { marginTop: 0 }]}>
          {children}
        </View>

        {/* Actions */}
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
  // Dimmed backdrop
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  // Floating card
  card: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '22%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.06)', // soft border

    // soft shadow
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  title: {
    fontSize: 16,
    fontWeight: Platform.select({ ios: '700', android: '700' }),
    color: '#0F172A', // slate-900
  },

  body: {
    marginTop: 8,
  },

  actionBtn: {
    alignSelf: 'flex-end',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB', // gray-200
    backgroundColor: '#F8FAFC', // slate-50
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: 13,
    fontWeight: Platform.select({ ios: '700', android: '700' }),
    color: '#111827', // gray-900
  },
});

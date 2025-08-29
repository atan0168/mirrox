import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius, screen } from '../../theme';
import InfoTable, { TableRow } from './InfoTable';

interface TooltipProps {
  visible: boolean;
  content?: string | React.ReactNode;
  onClose: () => void;
  title?: string;
  tableTitle?: string;
  tableRows?: TableRow[];
}

const Tooltip: React.FC<TooltipProps> = ({
  visible,
  content,
  onClose,
  title,
  tableTitle,
  tableRows,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.tooltipOverlay}>
        {/* Backdrop that closes the tooltip when pressed outside the card */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Foreground content card */}
        <View style={styles.tooltipContainer}>
          <View style={styles.header}>
            {title && <Text style={styles.title}>{title}</Text>}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Prefer InfoTable when rows are provided; fallback to content */}
            {Array.isArray(tableRows) && tableRows.length > 0 ? (
              <InfoTable title={tableTitle} rows={tableRows} />
            ) : typeof content === 'string' ? (
              <Text style={styles.tooltipText}>{content}</Text>
            ) : (
              content
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  tooltipContainer: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    maxWidth: Math.min(screen.width - spacing.xl * 2, 500),
    minWidth: 200,
    maxHeight: Math.min(screen.height - spacing.xl * 3, 560),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxWidth: '100%',
  },
  contentInner: {
    paddingBottom: spacing.lg,
  },
  tooltipText: {
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 22,
  },
});

export default Tooltip;

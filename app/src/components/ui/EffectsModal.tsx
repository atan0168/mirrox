import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button } from './Button';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface EffectData {
  id: string;
  title: string;
  description: string;
  details: string[];
  severity: 'low' | 'medium' | 'high';
  source: string;
  actionRecommendations?: string[];
}

interface EffectsModalProps {
  visible: boolean;
  onClose: () => void;
  effect: EffectData | null;
}

export const EffectsModal: React.FC<EffectsModalProps> = ({
  visible,
  onClose,
  effect,
}) => {
  if (!effect) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.red?.[600] || '#DC2626';
      case 'medium':
        return colors.yellow?.[600] || '#D97706';
      case 'low':
        return colors.green?.[600] || '#059669';
      default:
        return colors.neutral[600];
    }
  };

  const getSeverityBackground = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.red?.[50] || '#FEF2F2';
      case 'medium':
        return colors.yellow?.[50] || '#FFFBEB';
      case 'low':
        return colors.green?.[50] || '#ECFDF5';
      default:
        return colors.neutral[50];
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{effect.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityBackground(effect.severity) },
            ]}
          >
            <Text
              style={[
                styles.severityText,
                { color: getSeverityColor(effect.severity) },
              ]}
            >
              {effect.severity.toUpperCase()} IMPACT
            </Text>
          </View>

          <Text style={styles.description}>{effect.description}</Text>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Effect Details</Text>
            {effect.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <Text style={styles.detailBullet}>•</Text>
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </View>

          {effect.actionRecommendations &&
            effect.actionRecommendations.length > 0 && (
              <View style={styles.actionsSection}>
                <Text style={styles.actionsTitle}>Recommended Actions</Text>
                {effect.actionRecommendations.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionBullet}>✓</Text>
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

          <View style={styles.sourceSection}>
            <Text style={styles.sourceLabel}>Data Source</Text>
            <Text style={styles.sourceText}>{effect.source}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button variant="secondary" onPress={onClose} fullWidth>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.neutral[700],
    marginBottom: spacing.xl,
  },
  detailsSection: {
    marginBottom: spacing.xl,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  detailBullet: {
    fontSize: fontSize.base,
    color: colors.neutral[600],
    marginRight: spacing.sm,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: fontSize.base,
    lineHeight: 22,
    color: colors.neutral[700],
  },
  sourceSection: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  sourceLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  sourceText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  actionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  actionBullet: {
    fontSize: fontSize.base,
    color: colors.green[600],
    marginRight: spacing.sm,
    marginTop: 2,
    fontWeight: '600',
  },
  actionText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.neutral[700],
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});

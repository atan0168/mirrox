import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { Card } from './Card';

type BannerType = 'info' | 'warning' | 'error' | 'success';

export interface InlineBannerProps {
  type?: BannerType;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  primaryAction?: { label: string; onPress: () => void; disabled?: boolean };
  secondaryAction?: { label: string; onPress: () => void; disabled?: boolean };
  onClose?: () => void;
  style?: ViewStyle;
}

export const InlineBanner: React.FC<InlineBannerProps> = ({
  type = 'info',
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  onClose,
  style,
}) => {
  const palette = getTypePalette(type);

  return (
    <Card
      variant="outline"
      padding="md"
      style={StyleSheet.flatten([styles.container, style])}
      accessibilityRole="summary"
    >
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: palette.text }]}>
              {description}
            </Text>
          ) : null}
          {(primaryAction || secondaryAction) && (
            <View style={styles.actions}>
              {primaryAction ? (
                <TouchableOpacity
                  onPress={primaryAction.onPress}
                  disabled={primaryAction.disabled}
                  style={[
                    styles.actionPrimary,
                    primaryAction.disabled && styles.actionDisabled,
                  ]}
                >
                  <Text style={styles.actionPrimaryText}>
                    {primaryAction.label}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {secondaryAction ? (
                <TouchableOpacity
                  onPress={secondaryAction.onPress}
                  disabled={secondaryAction.disabled}
                  style={styles.actionSecondary}
                >
                  <Text style={styles.actionSecondaryText}>
                    {secondaryAction.label}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
};

function getTypePalette(type: BannerType) {
  switch (type) {
    case 'warning':
      return {
        accent: colors.yellow[300],
        title: colors.neutral[900],
        text: colors.neutral[700],
      };
    case 'error':
      return {
        accent: colors.red[400],
        title: colors.neutral[900],
        text: colors.neutral[700],
      };
    case 'success':
      return {
        accent: colors.green[400],
        title: colors.neutral[900],
        text: colors.neutral[700],
      };
    default:
      return {
        accent: colors.sky[300],
        title: colors.neutral[900],
        text: colors.neutral[700],
      };
  }
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.md,
  },
  actionPrimaryText: {
    color: colors.neutral[100],
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actionSecondary: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionSecondaryText: {
    color: colors.neutral[600],
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  close: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },
  closeText: {
    color: colors.neutral[500],
    fontSize: fontSize.base,
  },
});

export default InlineBanner;

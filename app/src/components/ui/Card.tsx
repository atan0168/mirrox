import * as React from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  ...viewProps
}) => {
  const variantStyles = getVariantStyles(variant);
  const paddingStyles = getPaddingStyles(padding);

  return (
    <View
      style={[
        styles.container,
        variantStyles,
        paddingStyles,
        style,
      ]}
      {...viewProps}
    >
      {children}
    </View>
  );
};

const getVariantStyles = (variant: CardProps['variant']) => {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: colors.white,
        borderWidth: 0,
        ...shadows.medium,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        ...shadows.none,
      };
    default: // default
      return {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        ...shadows.soft,
      };
  }
};

const getPaddingStyles = (padding: CardProps['padding']) => {
  switch (padding) {
    case 'none':
      return {};
    case 'sm':
      return {
        padding: spacing.sm,
      };
    case 'lg':
      return {
        padding: spacing.lg,
      };
    default: // md
      return {
        padding: spacing.md,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

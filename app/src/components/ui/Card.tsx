import * as React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'sm',
  style,
  ...viewProps
}) => {
  const variantStyles = getVariantStyles(variant);
  const paddingStyles = getPaddingStyles(padding);
  const shadowStyles = getShadowStyles(shadow);

  return (
    <View
      style={[
        styles.container,
        variantStyles,
        paddingStyles,
        shadowStyles,
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
    case 'ghost':
      return {
        backgroundColor: colors.neutral[50],
        borderWidth: 0,
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

const getShadowStyles = (shadow: CardProps['shadow']) => {
  switch (shadow) {
    case 'none':
      return shadows.none;
    case 'sm':
      return shadows.soft;
    case 'md':
      return shadows.medium;
    case 'lg':
      return shadows.hard;
    default: // sm
      return shadows.soft;
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

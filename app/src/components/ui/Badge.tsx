import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant);

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        variantStyles.container,
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[styles.text, sizeStyles.text, variantStyles.text, textStyle]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

const getSizeStyles = (size: BadgeProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        container: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          minHeight: 20,
        },
        text: {
          fontSize: fontSize.xs,
        },
      };
    case 'lg':
      return {
        container: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 32,
        },
        text: {
          fontSize: fontSize.base,
        },
      };
    default: // md
      return {
        container: {
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs + 1,
          minHeight: 24,
        },
        text: {
          fontSize: fontSize.sm,
        },
      };
  }
};

const getVariantStyles = (variant: BadgeProps['variant']) => {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: colors.neutral[200],
          borderColor: 'transparent',
        },
        text: {
          color: colors.neutral[700],
        },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: colors.neutral[300],
          borderWidth: 1,
        },
        text: {
          color: colors.neutral[600],
        },
      };
    default: // default
      return {
        container: {
          backgroundColor: colors.neutral[900],
          borderColor: 'transparent',
        },
        text: {
          color: colors.white,
        },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
    textAlign: 'center',
  },
});

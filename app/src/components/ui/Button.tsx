import * as React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  PressableProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../theme';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style,
  textStyle,
  disabled,
  ...pressableProps
}) => {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
        pressed && styles.pressed,
      ]}
      disabled={disabled}
      {...pressableProps}
    >
      {/* Subtle inner gradient for depth */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(0, 0, 0, 0.02)']}
        style={[StyleSheet.absoluteFill, styles.gradientOverlay]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Content */}
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            sizeStyles.text,
            variantStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

const getSizeStyles = (size: ButtonProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        container: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: 36,
        },
        text: {
          fontSize: fontSize.sm,
        },
      };
    case 'lg':
      return {
        container: {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          minHeight: 48,
        },
        text: {
          fontSize: fontSize.lg,
        },
      };
    default: // md
      return {
        container: {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm + 2,
          minHeight: 40,
        },
        text: {
          fontSize: fontSize.base,
        },
      };
  }
};

const getVariantStyles = (variant: ButtonProps['variant']) => {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: colors.neutral[100],
          borderColor: colors.neutral[300],
        },
        text: {
          color: colors.neutral[700],
        },
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
        text: {
          color: colors.neutral[600],
        },
      };
    default: // primary
      return {
        container: {
          backgroundColor: colors.white,
          borderColor: colors.neutral[200],
        },
        text: {
          color: colors.black,
        },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.soft,
  },
  gradientOverlay: {
    borderRadius: borderRadius.lg,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
});

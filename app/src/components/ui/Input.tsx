import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outline';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  containerStyle,
  inputStyle,
  labelStyle,
  leftElement,
  rightElement,
  ...textInputProps
}) => {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant);
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, sizeStyles.label, labelStyle]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          sizeStyles.container,
          variantStyles.container,
          hasError && styles.errorContainer,
        ]}
      >
        {leftElement && <View style={styles.leftElement}>{leftElement}</View>}

        <TextInput
          style={[
            styles.input,
            sizeStyles.input,
            variantStyles.input,
            leftElement ? styles.inputWithLeft : null,
            rightElement ? styles.inputWithRight : null,
            inputStyle,
          ]}
          placeholderTextColor={colors.neutral[400]}
          {...textInputProps}
        />

        {rightElement && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            sizeStyles.helperText,
            hasError ? styles.errorText : styles.normalHelperText,
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const getSizeStyles = (size: InputProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        container: {
          minHeight: 36,
          paddingHorizontal: spacing.sm,
        },
        input: {
          fontSize: fontSize.sm,
        },
        label: {
          fontSize: fontSize.sm,
          marginBottom: spacing.xs,
        },
        helperText: {
          fontSize: fontSize.xs,
          marginTop: spacing.xs,
        },
      };
    case 'lg':
      return {
        container: {
          minHeight: 56,
          paddingHorizontal: spacing.lg,
        },
        input: {
          fontSize: fontSize.lg,
        },
        label: {
          fontSize: fontSize.base,
          marginBottom: spacing.sm,
        },
        helperText: {
          fontSize: fontSize.sm,
          marginTop: spacing.sm,
        },
      };
    default: // md
      return {
        container: {
          minHeight: 44,
          paddingHorizontal: spacing.md,
        },
        input: {
          fontSize: fontSize.base,
        },
        label: {
          fontSize: fontSize.sm,
          marginBottom: spacing.xs,
        },
        helperText: {
          fontSize: fontSize.sm,
          marginTop: spacing.xs,
        },
      };
  }
};

const getVariantStyles = (variant: InputProps['variant']) => {
  switch (variant) {
    case 'filled':
      return {
        container: {
          backgroundColor: colors.neutral[50],
          borderWidth: 0,
        },
        input: {
          color: colors.black,
        },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.neutral[300],
        },
        input: {
          color: colors.black,
        },
      };
    default: // default
      return {
        container: {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.neutral[200],
        },
        input: {
          color: colors.black,
        },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    ...shadows.soft,
  },
  input: {
    flex: 1,
    paddingVertical: 0, // Remove default padding
  },
  inputWithLeft: {
    marginLeft: spacing.sm,
  },
  inputWithRight: {
    marginRight: spacing.sm,
  },
  leftElement: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightElement: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '500',
    color: colors.neutral[700],
  },
  helperText: {
    fontWeight: '400',
  },
  normalHelperText: {
    color: colors.neutral[500],
  },
  errorText: {
    color: colors.neutral[900],
  },
  errorContainer: {
    borderColor: colors.neutral[400],
  },
});

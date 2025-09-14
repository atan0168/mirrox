import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface InfoSquareProps {
  title: string;
  value?: string | number | null;
  statusText?: string | null;
  color?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
  onPress?: () => void;
}

export const InfoSquare: React.FC<InfoSquareProps> = ({
  title,
  value,
  statusText,
  color,
  icon,
  loading = false,
  errorMessage,
  disabled = false,
  onPress,
}) => {
  const borderColor = color ?? colors.neutral[400];

  return (
    <TouchableOpacity
      style={[styles.square, { borderColor }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon ? <View style={styles.squareIcon}>{icon}</View> : null}
      <Text style={styles.squareValue}>
        {errorMessage ? 'Error' : loading ? '...' : (value ?? 'N/A')}
      </Text>
      <Text style={styles.squareLabel}>{title}</Text>
      {errorMessage ? (
        <Text style={[styles.squareError, { color: colors.red[500] }]}>
          {errorMessage}
        </Text>
      ) : statusText ? (
        <Text style={[styles.squareStatus, { color: borderColor }]}>
          {statusText}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  square: {
    width: '47%',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 160,
  },
  squareIcon: {
    marginBottom: spacing.sm,
  },
  squareValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
    textAlign: 'center',
  },
  squareLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  squareStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  squareError: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default InfoSquare;

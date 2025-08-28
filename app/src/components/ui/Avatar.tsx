import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../theme';

export interface AvatarProps {
  size?: number;
  source?: string;
  fallback?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  source,
  fallback,
  style,
  textStyle,
}) => {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = size * 0.4;

  return (
    <View style={[styles.container, avatarStyle, style]}>
      {source ? (
        // In a real app, you'd use Image component here
        <View style={[styles.imagePlaceholder, avatarStyle]}>
          <Text style={[styles.placeholderText, { fontSize: textSize }]}>
            IMG
          </Text>
        </View>
      ) : (
        <Text style={[styles.fallbackText, { fontSize: textSize }, textStyle]}>
          {fallback || '?'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  imagePlaceholder: {
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.neutral[500],
    fontWeight: '500',
  },
  fallbackText: {
    color: colors.neutral[600],
    fontWeight: '600',
    textAlign: 'center',
  },
});

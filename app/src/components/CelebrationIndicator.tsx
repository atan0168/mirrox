import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { BADGE_DEFS, type BadgeId } from '../constants/badges';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

type Props = {
  badgeId: BadgeId;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function CelebrationIndicator({ badgeId, onPress, style }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const badge = BADGE_DEFS[badgeId];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Celebrate ${badge.title}`}
      onPress={onPress}
      style={[styles.root, style]}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.text}>Tap to celebrate</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    ...shadows.soft,
  },
  icon: {
    fontSize: fontSize.lg,
  },
  text: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
});

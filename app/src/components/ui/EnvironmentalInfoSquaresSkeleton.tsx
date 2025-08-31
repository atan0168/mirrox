import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Card } from './Card';
import { colors, spacing, borderRadius } from '../../theme';

export const EnvironmentalInfoSquaresSkeleton: React.FC = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Air Quality Square Skeleton */}
      <Card style={styles.square}>
        <View style={styles.iconSkeleton} />
        <Animated.View style={[styles.textSkeleton, { opacity }]} />
        <Animated.View
          style={[styles.textSkeleton, { opacity, width: '60%' }]}
        />
      </Card>

      {/* Traffic Square Skeleton */}
      <Card style={styles.square}>
        <View style={styles.iconSkeleton} />
        <Animated.View style={[styles.textSkeleton, { opacity }]} />
        <Animated.View
          style={[styles.textSkeleton, { opacity, width: '60%' }]}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  square: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    minHeight: 120,
  },
  iconSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
    marginBottom: spacing.md,
  },
  textSkeleton: {
    height: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    width: '80%',
  },
});

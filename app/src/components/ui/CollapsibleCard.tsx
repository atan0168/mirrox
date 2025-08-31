import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card } from './Card';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface CollapsibleCardProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  count,
  defaultExpanded = false,
  children,
  style,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const heightAnim = useRef(
    new Animated.Value(defaultExpanded ? 1 : 0)
  ).current; // 0..1 multiplier
  const rotate = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    Animated.timing(heightAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false, // animating height
    }).start();
  }, [expanded, heightAnim, rotate]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const animatedHeight = {
    maxHeight:
      measuredHeight === 0
        ? undefined
        : heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, measuredHeight],
          }),
    overflow: 'hidden' as const,
  };

  return (
    <Card style={StyleSheet.flatten([styles.card, style])}>
      <TouchableOpacity
        style={[styles.header, { marginBottom: expanded ? spacing.md : 0 }]}
        onPress={() => setExpanded(prev => !prev)}
      >
        <Text style={styles.title}>
          {title}
          {typeof count === 'number' ? ` (${count})` : ''}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronRight size={18} color={colors.neutral[600]} />
        </Animated.View>
      </TouchableOpacity>

      {/* Invisible measuring container */}
      <View
        style={styles.measure}
        pointerEvents="none"
        onLayout={e => setMeasuredHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.contentInner}>{children}</View>
      </View>

      {/* Animated visible content */}
      <Animated.View style={[styles.content, animatedHeight]}>
        <View style={styles.contentInner}>{children}</View>
      </Animated.View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  content: {
    width: '100%',
  },
  contentInner: {
    gap: spacing.sm,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
});

export default CollapsibleCard;

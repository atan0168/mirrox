import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface AccordionProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  style?: any;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  count,
  defaultExpanded = false,
  children,
  style,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotate = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const contentOpacity = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const contentScale = useRef(new Animated.Value(defaultExpanded ? 1 : 0.98)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: expanded ? 1 : 0.98,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, rotate, contentOpacity, contentScale]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(prev => !prev)}>
        <Text style={styles.title}>
          {title}
          {typeof count === 'number' ? ` (${count})` : ''}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronRight size={18} color={colors.neutral[600]} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ scaleY: contentScale }],
        }}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});

export default Accordion;


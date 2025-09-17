import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const DURATION = 200;
const HOLD = 200;
const GAP = 100;

const LoadingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = (val: Animated.Value) =>
      Animated.timing(val, {
        toValue: 1,
        duration: DURATION,
        useNativeDriver: true,
      });

    const fadeOut = (val: Animated.Value) =>
      Animated.timing(val, {
        toValue: 0,
        duration: DURATION,
        useNativeDriver: true,
      });

    const loopAnim = Animated.loop(
      Animated.sequence([
        // start at 0 dots
        Animated.delay(HOLD),

        // 1 dot
        fadeIn(dot1),
        Animated.delay(HOLD),

        // 2 dots
        fadeIn(dot2),
        Animated.delay(HOLD),

        // 3 dots
        fadeIn(dot3),
        Animated.delay(HOLD),

        // vanish all at once
        Animated.parallel([fadeOut(dot1), fadeOut(dot2), fadeOut(dot3)]),
        Animated.delay(GAP),
      ])
    );

    loopAnim.start();
    return () => loopAnim.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.row}>
      <Animated.Text style={[styles.dot, { opacity: dot1 }]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2 }]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3 }]}>.</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { fontSize: 24 },
});

export default LoadingDots;

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  View,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { colors, spacing, borderRadius, shadows, fontSize } from '../theme';
import { Star } from 'lucide-react-native';

type Props = {
  highlight?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  ariaLabel?: string;
};

export default function ViewAchievementButton({
  highlight = true,
  size,
  style,
  ariaLabel = 'Open badges',
}: Props) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Animations
  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  // Theme tokens & fallbacks
  const accent = colors.yellow[400];
  const accentStrong = colors.warning;

  const iconSize = size ?? fontSize.xl;

  const pad = spacing.xs;

  const [box, setBox] = useState({ w: iconSize, h: iconSize });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox(b =>
      b.w === width && b.h === height ? b : { w: width, h: height }
    );
  };

  useEffect(() => {
    if (!highlight) {
      pulse.stopAnimation();
      breathe.stopAnimation();
      pulse.setValue(0);
      breathe.setValue(0);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    breatheLoop.start();
    return () => {
      pulseLoop.stop();
      breatheLoop.stop();
    };
  }, [highlight, pulse, breathe]);

  // Halo animations
  const outerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const outerOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });
  const innerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });
  const innerOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0.1],
  });
  const iconScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const haloW = box.w + pad * 2;
  const haloH = box.h + pad * 2;

  const handlePress = () => {
    navigation.navigate('Achievements');
  };

  return (
    <View pointerEvents="box-none" style={[styles.container, style]}>
      {highlight && (
        <>
          <Animated.View
            style={[
              styles.halo,
              {
                width: haloW,
                height: haloH,
                borderRadius: haloH / 2,
                backgroundColor: accent,
                opacity: outerOpacity,
                transform: [{ scale: outerScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              {
                width: haloW * 0.9,
                height: haloH * 0.9,
                borderRadius: (haloH * 0.9) / 2,
                backgroundColor: accentStrong,
                opacity: innerOpacity,
                transform: [{ scale: innerScale }],
              },
            ]}
          />
        </>
      )}

      {/* ICON ONLY (no background box) */}
      <Animated.View
        style={{ transform: [{ scale: highlight ? iconScale : 1 }] }}
      >
        <Pressable
          onPress={handlePress}
          onLayout={onLayout}
          accessibilityRole="button"
          accessibilityLabel={ariaLabel}
          hitSlop={{
            top: spacing.xs,
            bottom: spacing.xs,
            left: spacing.xs,
            right: spacing.xs,
          }}
          android_ripple={undefined}
          style={{
            width: iconSize,
            height: iconSize,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: borderRadius.full,
            ...(Platform.OS === 'ios' ? shadows.none : null),
          }}
        >
          <Star fill={colors.orange[200]} stroke={colors.orange[200]} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
});

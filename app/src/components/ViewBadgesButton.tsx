import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { colors, spacing, borderRadius, shadows, fontSize } from '../theme';

type RouteName = Extract<keyof RootStackParamList, string>;

type Props = {
  highlight?: boolean; // show glow animation
  navigateTo?: RouteName; // target route
  size?: number; // icon square size (optional)
  ariaLabel?: string; // accessibility label
};

const DEFAULT_BADGE_ROUTE: RouteName = 'Twin';

export default function ViewBadgesButton({
  highlight = true,
  navigateTo,
  size,
  ariaLabel = 'Open badges',
}: Props) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Animations
  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  // Theme tokens & fallbacks
  const accent =
    (colors as any)?.warning ??
    (colors as any)?.yellow ??
    (colors as any)?.accent ??
    '#FFD54F';
  const accentStrong =
    (colors as any)?.amber ?? (colors as any)?.warningStrong ?? '#FFC400';
  const txt = (colors as any)?.onSurface ?? (colors as any)?.text ?? '#FFFFFF';

  // ✅ FIX: access numeric-like keys with bracket syntax
  const iconSize =
    size ?? (fontSize as any)['2xl'] ?? (fontSize as any).xl ?? 28;

  const pad = (spacing as any)?.lg ?? 16; // halo padding

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
    const route = (navigateTo ?? DEFAULT_BADGE_ROUTE) as RouteName;
    navigation.navigate(route);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: (spacing as any)?.xl ?? 20,
        bottom: (spacing as any)?.xl ?? 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* GOLD HALOS — no elevation (prevents gray), pure colored light */}
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
            top: (spacing as any)?.xs ?? 8,
            bottom: (spacing as any)?.xs ?? 8,
            left: (spacing as any)?.xs ?? 8,
            right: (spacing as any)?.xs ?? 8,
          }}
          android_ripple={undefined} // keep default ripple; no hard-coded color
          style={{
            width: iconSize,
            height: iconSize,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent', // no box
            borderRadius: (borderRadius as any)?.full ?? iconSize / 2,
            ...(Platform.OS === 'ios' ? ((shadows as any)?.none ?? {}) : null), // no gray shadow
          }}
        >
          {/* Medal icon; swap to Image if you have a custom asset */}
          <Text
            style={{
              fontSize: iconSize * 0.9,
              color: txt,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          >
            🏅
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    // no shadow/elevation: we want pure colored glow
  },
});

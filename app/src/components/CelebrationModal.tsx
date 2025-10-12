import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';
import { useConfetti } from '../hooks/useConfetti';
import { ConfettiView } from './effects/ConfettiView';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
};

const { width: SCREEN_W } = Dimensions.get('window');

const DUR = {
  enterScale: 160,
  enterFade: 140,
  pop1: 160,
  pop2: 80,
  pop3: 80,
  haloLoop: 520,
  rayLoop: 600,
};

export default function CelebrationModal({ visible, title, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const medalPop = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;

  const confetti = useConfetti({
    count: 64,
    colors: ['#FFD54F', '#4FC3F7', '#FF8A80', '#CE93D8', '#80CBC4'],
    shapes: ['rectangle'],
    duration: 900,
    fallDistance: 220,
    startOffset: 160,
    spread: Math.min(420, SCREEN_W - spacing.lg * 2),
  });

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: DUR.enterScale,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: DUR.enterFade,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    medalPop.setValue(0);
    Animated.sequence([
      Animated.timing(medalPop, {
        toValue: 1,
        duration: DUR.pop1,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
      Animated.timing(medalPop, {
        toValue: 0.96,
        duration: DUR.pop2,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(medalPop, {
        toValue: 1,
        duration: DUR.pop3,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    halo.setValue(0);
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: DUR.haloLoop,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: DUR.haloLoop,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    haloLoop.start();

    rays.setValue(0);
    const rayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rays, {
          toValue: 1,
          duration: DUR.rayLoop,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rays, {
          toValue: 0,
          duration: DUR.rayLoop,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    rayLoop.start();

    confetti.trigger();

    return () => {
      haloLoop.stop();
      rayLoop.stop();
      scale.setValue(0.9);
      fade.setValue(0);
      confetti.reset();
    };
  }, [visible]);

  const medalStyle = { transform: [{ scale: medalPop }] };
  const haloOpacity = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });
  const haloScale = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.18],
  });
  const rayOpacity = rays.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.7],
  });
  const rayScale = rays.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  const renderRays = () => {
    const RAY_COUNT = 12;
    return Array.from({ length: RAY_COUNT }, (_, i) => {
      const angle = (i / RAY_COUNT) * 360;
      return (
        <Animated.View
          key={`ray-${i}`}
          pointerEvents="none"
          style={[
            styles.ray,
            {
              opacity: rayOpacity as any,
              transform: [
                { scale: rayScale as any },
                { rotate: `${angle}deg` as any },
              ],
            },
          ]}
        />
      );
    });
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          renderToHardwareTextureAndroid
          style={[styles.card, { opacity: fade, transform: [{ scale }] }]}
        >
          <View style={styles.ribbon} />
          <View style={styles.medalWrap}>
            <Animated.View
              pointerEvents="none"
              renderToHardwareTextureAndroid
              style={[
                styles.halo,
                {
                  opacity: haloOpacity as any,
                  transform: [{ scale: haloScale as any }],
                },
              ]}
            />
            <View style={styles.raysWrap}>{renderRays()}</View>
            <ConfettiView
              particles={confetti.particles}
              getParticleStyle={confetti.getParticleStyle}
            />
            <Animated.Text style={[styles.medal, medalStyle]}>🏅</Animated.Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.btn,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={styles.btnText}>Awesome 🎉</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const CARD_MAX_W = Math.min(420, SCREEN_W - spacing.lg * 2);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_W,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.soft,
    ...(Platform.OS === 'android' ? { elevation: 4 } : null),
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFE082',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  medalWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  halo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
  },
  raysWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 7,
    height: 78,
    borderRadius: 7,
    backgroundColor: 'rgba(255,215,0,0.85)',
    top: 40,
    left: (160 - 7) / 2,
  },
  medal: {
    fontSize: 72,
  },
  title: {
    fontSize: fontSize.lg + 4,
    fontWeight: '900',
    color: colors.neutral[900],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  btnText: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

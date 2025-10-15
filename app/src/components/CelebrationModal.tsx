import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';

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
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (visible) {
      confettiRef.current?.start();
    }
  }, [visible]);

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

    return () => {
      haloLoop.stop();
      rayLoop.stop();
      scale.setValue(0.9);
      fade.setValue(0);
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
              opacity: rayOpacity,
              transform: [{ scale: rayScale }, { rotate: `${angle}deg` }],
            },
          ]}
        />
      );
    });
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
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
                    opacity: haloOpacity,
                    transform: [{ scale: haloScale }],
                  },
                ]}
              />
              <View style={styles.raysWrap}>{renderRays()}</View>
              <Animated.Text style={[styles.medal, medalStyle]}>
                🏅
              </Animated.Text>
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
        </Pressable>
        {/* Confetti effect for quest completion */}
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: -20, y: 0 }}
          autoStart={false}
          fadeOut
        />
      </Pressable>
    </Modal>
  );
}

const CARD_MAX_W = Math.min(420, SCREEN_W - spacing.lg * 2);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  spotlight: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '50%',
    left: '50%',
    marginLeft: -140,
    marginTop: -140,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 10,
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
  confettiLayer: {
    flex: 1,
    pointerEvents: 'none',
  },
});

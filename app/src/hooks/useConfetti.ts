import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type ConfettiShape = 'rectangle' | 'circle' | 'star' | 'custom';

export type ConfettiParticle = {
  startX: number;
  driftX: number;
  rotateStart: number;
  rotateEnd: number;
  delay: number;
  color: string;
  width: number;
  height: number;
  shape: ConfettiShape;
};

export type ConfettiConfig = {
  count?: number;
  colors?: string[];
  shapes?: ConfettiShape[];
  duration?: number;
  fallDistance?: number;
  startOffset?: number;
  spread?: number;
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
};

const DEFAULT_CONFIG: Required<ConfettiConfig> = {
  count: 64,
  colors: ['#FFD54F', '#4FC3F7', '#FF8A80', '#CE93D8', '#80CBC4'],
  shapes: ['rectangle'],
  duration: 900,
  fallDistance: SCREEN_H,
  startOffset: 160,
  spread: SCREEN_W,
  minSize: { width: 4, height: 8 },
  maxSize: { width: 10, height: 20 },
};

export function useConfetti(config: ConfettiConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const confettiProgress = useRef(new Animated.Value(0)).current;
  const isActive = useRef(false);

  const particles = useMemo<ConfettiParticle[]>(() => {
    const { count, colors, shapes, spread, minSize, maxSize } = mergedConfig;
    const halfW = spread / 2;

    return Array.from({ length: count }).map((_, i) => {
      const startX = (Math.random() * 2 - 1) * (halfW - 12);
      const driftX = startX + (Math.random() * 2 - 1) * 28;
      const rotateStart = Math.random() * 120 - 60;
      const rotateEnd =
        rotateStart +
        (Math.random() * 360 + 180) * (Math.random() > 0.5 ? 1 : -1);
      const delay = (i % 12) * 18;
      const color = colors[i % colors.length];
      const width =
        minSize.width +
        Math.floor(Math.random() * (maxSize.width - minSize.width));
      const height =
        minSize.height +
        Math.floor(Math.random() * (maxSize.height - minSize.height));
      const shape = shapes[i % shapes.length];

      return {
        startX,
        driftX,
        rotateStart,
        rotateEnd,
        delay,
        color,
        width,
        height,
        shape,
      };
    });
  }, []);

  const trigger = () => {
    if (isActive.current) return;
    isActive.current = true;

    confettiProgress.setValue(0);
    Animated.timing(confettiProgress, {
      toValue: 1,
      duration: mergedConfig.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      isActive.current = false;
    });
  };

  const reset = () => {
    confettiProgress.setValue(0);
    isActive.current = false;
  };

  const getParticleStyle = (particle: ConfettiParticle) => {
    const tX = confettiProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [particle.startX, particle.driftX],
    });
    const tY = confettiProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [-mergedConfig.startOffset, mergedConfig.fallDistance],
    });
    const rot = confettiProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [`${particle.rotateStart}deg`, `${particle.rotateEnd}deg`],
    });

    return {
      transform: [
        { translateX: tX as any },
        { translateY: tY as any },
        { rotate: rot as any },
      ],
    };
  };

  return {
    particles,
    trigger,
    reset,
    getParticleStyle,
    progress: confettiProgress,
    isActive: isActive.current,
  };
}

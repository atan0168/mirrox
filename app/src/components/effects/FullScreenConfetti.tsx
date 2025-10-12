import React, { ReactElement } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useConfetti, ConfettiConfig } from '../../hooks/useConfetti';
import { ConfettiView } from './ConfettiView';

type FullScreenConfettiProps = {
  config?: ConfettiConfig;
  customShape?: (particle: any) => ReactElement;
  onTrigger?: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function FullScreenConfetti({
  config,
  customShape,
  onTrigger,
}: FullScreenConfettiProps) {
  const confetti = useConfetti({
    count: 100,
    fallDistance: SCREEN_H,
    spread: SCREEN_W,
    duration: 3000,
    shapes: ['star', 'circle', 'rectangle'],
    colors: ['#FFD54F', '#4FC3F7', '#FF8A80', '#CE93D8', '#80CBC4', '#AED581'],
    ...config,
  });

  React.useEffect(() => {
    if (onTrigger) {
      confetti.trigger();
    }
  }, [onTrigger]);

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiView
        particles={confetti.particles}
        getParticleStyle={confetti.getParticleStyle}
        customShape={customShape}
      />
    </View>
  );
}

export const useFullScreenConfetti = (config?: ConfettiConfig) => {
  const confetti = useConfetti({
    count: 100,
    fallDistance: SCREEN_H,
    spread: SCREEN_W,
    duration: 3000,
    shapes: ['star', 'circle', 'rectangle'],
    colors: ['#FFD54F', '#4FC3F7', '#FF8A80', '#CE93D8', '#80CBC4', '#AED581'],
    ...config,
  });

  return confetti;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});

import React, { ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { ConfettiShape } from './ConfettiShape';
import { ConfettiParticle } from '../../hooks/useConfetti';

type ConfettiViewProps = {
  particles: ConfettiParticle[];
  getParticleStyle: (particle: ConfettiParticle) => any;
  customShape?: (particle: ConfettiParticle) => ReactElement;
};

export function ConfettiView({
  particles,
  getParticleStyle,
  customShape,
}: ConfettiViewProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.centerWrap}>
        {particles.map((particle, i) => (
          <ConfettiShape
            key={`confetti-${i}`}
            particle={particle}
            style={getParticleStyle(particle)}
            customShape={customShape}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});

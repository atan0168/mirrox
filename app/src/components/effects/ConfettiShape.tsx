import React, { ReactElement } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ConfettiParticle } from '../hooks/useConfetti';

type ConfettiShapeProps = {
  particle: ConfettiParticle;
  style: any;
  customShape?: (particle: ConfettiParticle) => ReactElement;
};

const StarShape = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={color}
    />
  </Svg>
);

const CircleShape = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
  </Svg>
);

export function ConfettiShape({
  particle,
  style,
  customShape,
}: ConfettiShapeProps) {
  const renderShape = () => {
    if (customShape) {
      return customShape(particle);
    }

    switch (particle.shape) {
      case 'star':
        return <StarShape size={particle.width} color={particle.color} />;
      case 'circle':
        return <CircleShape size={particle.width} color={particle.color} />;
      case 'rectangle':
      default:
        return (
          <View
            style={{
              width: particle.width,
              height: particle.height,
              backgroundColor: particle.color,
              borderRadius: 2,
            }}
          />
        );
    }
  };

  return (
    <Animated.View pointerEvents="none" style={[styles.particle, style]}>
      {renderShape()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

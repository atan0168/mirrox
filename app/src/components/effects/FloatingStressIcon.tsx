import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { Text } from '@react-three/drei/native';
import * as THREE from 'three';

interface FloatingStressIconProps {
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  congestionFactor: number;
  enabled?: boolean;
  position?: [number, number, number];
}

export function FloatingStressIcon({
  stressLevel,
  congestionFactor,
  enabled = true,
  position = [0, 2.5, 0], // Above avatar's head
}: FloatingStressIconProps) {
  const groupRef = useRef<THREE.Group>(null);
  const iconRef = useRef<THREE.Mesh>(null);

  // Get icon and color based on stress level
  const { icon, color, shouldShow } = useMemo(() => {
    switch (stressLevel) {
      case 'mild':
        return {
          icon: '😤', // Huffing face
          color: '#FFC107', // Yellow
          shouldShow: true,
        };
      case 'moderate':
        return {
          icon: '😰', // Anxious face with sweat
          color: '#FF9800', // Orange
          shouldShow: true,
        };
      case 'high':
        return {
          icon: '🤯', // Exploding head
          color: '#F44336', // Red
          shouldShow: true,
        };
      default:
        return {
          icon: '',
          color: '#4CAF50',
          shouldShow: false,
        };
    }
  }, [stressLevel]);

  // Animate the floating icon
  useFrame(state => {
    if (groupRef.current && shouldShow && enabled) {
      const time = state.clock.elapsedTime;

      // Floating animation
      const floatY = Math.sin(time * 2) * 0.1;
      groupRef.current.position.y = position[1] + floatY;

      // Gentle rotation for high stress
      if (stressLevel === 'high') {
        groupRef.current.rotation.z = Math.sin(time * 4) * 0.1;
      }

      // Scale pulsing based on congestion factor
      const pulseScale = 1 + Math.sin(time * 3) * 0.1 * (congestionFactor - 1);
      groupRef.current.scale.setScalar(Math.max(0.8, pulseScale));
    }
  });

  if (!enabled || !shouldShow) {
    return null;
  }

  return (
    <group ref={groupRef} position={position}>
      {/* Background circle for better visibility */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stress icon */}
      <Text
        ref={iconRef}
        fontSize={0.6}
        color={color}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0]}
      >
        {icon}
      </Text>

      {/* Additional visual effects for high stress */}
      {stressLevel === 'high' && (
        <>
          {/* Pulsing ring */}
          <mesh position={[0, 0, -0.05]}>
            <ringGeometry args={[0.5, 0.6, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer glow ring */}
          <mesh position={[0, 0, -0.15]}>
            <ringGeometry args={[0.7, 0.8, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

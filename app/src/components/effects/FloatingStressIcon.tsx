import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

interface FloatingStressIconProps {
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  congestionFactor: number;
  enabled?: boolean;
  position?: [number, number, number];
  onPress?: () => void; // Callback for when the icon is pressed
}

export function FloatingStressIcon({
  stressLevel,
  congestionFactor,
  enabled = true,
  position = [0, 2.5, 0], // Above avatar's head
  onPress,
}: FloatingStressIconProps) {
  const groupRef = useRef<THREE.Group>(null);
  const iconRef = useRef<THREE.Mesh>(null);

  // Get visual style based on stress level
  const { color, shouldShow, intensity } = useMemo(() => {
    switch (stressLevel) {
      case 'mild':
        return {
          color: '#FFC107', // Yellow
          shouldShow: true,
          intensity: 1,
        };
      case 'moderate':
        return {
          color: '#FF9800', // Orange
          shouldShow: true,
          intensity: 2,
        };
      case 'high':
        return {
          color: '#F44336', // Red
          shouldShow: true,
          intensity: 3,
        };
      default:
        return {
          color: '#4CAF50',
          shouldShow: false,
          intensity: 0,
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

  // Create custom geometry for symbols
  const createExclamationMark = (color: number | string = 0xff6600) => {
    const group = new THREE.Group();

    const material = new THREE.MeshBasicMaterial({ color });

    // Exclamation line
    const lineGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    const lineMesh = new THREE.Mesh(lineGeometry, material);
    lineMesh.position.y = 0.05;
    group.add(lineMesh);

    // Exclamation dot
    const dotGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const dotMesh = new THREE.Mesh(dotGeometry, material);
    dotMesh.position.y = -0.15;
    group.add(dotMesh);

    return group;
  };

  const createWarningTriangle = () => {
    const group = new THREE.Group();

    // Triangle outline
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0.15);
    triangleShape.lineTo(-0.13, -0.15);
    triangleShape.lineTo(0.13, -0.15);
    triangleShape.lineTo(0, 0.15);

    const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
    triangleGeometry.translate(0, 0.03, 0);
    const triangleMesh = new THREE.Mesh(
      triangleGeometry,
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.9,
      })
    );
    group.add(triangleMesh);

    // Inner exclamation
    const innerExclamation = createExclamationMark(0xff9800);
    innerExclamation.scale.setScalar(0.6);
    group.add(innerExclamation);

    return group;
  };

  const createStressSymbol = useMemo(() => {
    switch (intensity) {
      case 1:
        // Mild stress - simple dot
        return () => {
          const group = new THREE.Group();
          const dotGeometry = new THREE.SphereGeometry(0.08, 16, 16);
          const dotMesh = new THREE.Mesh(
            dotGeometry,
            new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
          );
          group.add(dotMesh);
          return group;
        };
      case 2:
        // Moderate stress - warning triangle
        return createWarningTriangle;
      case 3:
        // High stress - exclamation mark
        return createExclamationMark;
      default:
        return () => new THREE.Group();
    }
  }, [intensity]);

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible clickable area (larger than visual for easier tapping) */}
      <mesh position={[0, 0, 0.1]} onClick={onPress} onPointerDown={onPress}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Main circular badge background */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* White border ring */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[0.22, 0.25, 32]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Symbol in the center */}
      <primitive
        ref={iconRef}
        object={createStressSymbol()}
        position={[0, 0, 0]}
      />

      {/* Subtle glow effect for higher stress levels */}
      {intensity >= 2 && (
        <mesh position={[0, 0, -0.05]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Additional pulsing ring for high stress */}
      {intensity === 3 && (
        <mesh position={[0, 0, -0.03]}>
          <ringGeometry args={[0.3, 0.4, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

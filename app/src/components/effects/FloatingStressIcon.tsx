import { useRef, useMemo } from 'react';
import { colors } from '../../theme';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

interface FloatingStressIconProps {
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  stressIntensity: number;
  enabled?: boolean;
  position?: [number, number, number];
  onPress?: () => void; // Callback for when the icon is pressed
}

export function FloatingStressIcon({
  stressLevel,
  stressIntensity,
  enabled = true,
  position = [0, 2.5, 0], // Above avatar's head
  onPress,
}: FloatingStressIconProps) {
  // Outer billboard group (faces camera)
  const billboardRef = useRef<THREE.Group>(null);
  // Inner animated content group
  const groupRef = useRef<THREE.Group>(null);
  const iconRef = useRef<THREE.Object3D>(null);
  const { camera } = useThree();

  // Get visual style based on stress level
  const { color, shouldShow, severityTier } = useMemo(() => {
    switch (stressLevel) {
      case 'mild':
        return {
          color: colors.yellow[400], // Yellow
          shouldShow: true,
          severityTier: 1,
        };
      case 'moderate':
        return {
          color: colors.orange[500], // Orange
          shouldShow: true,
          severityTier: 2,
        };
      case 'high':
        return {
          color: colors.red[500], // Red
          shouldShow: true,
          severityTier: 3,
        };
      default:
        return {
          color: colors.green[500],
          shouldShow: false,
          severityTier: 0,
        };
    }
  }, [stressLevel]);

  // Create custom geometry for symbols (helpers defined before any early returns)
  // High-stress: use white mark for strong contrast
  const createExclamationMark = (color: number | string = colors.white) => {
    const group = new THREE.Group();
    group.renderOrder = 100000;
    group.frustumCulled = false;

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

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
    group.renderOrder = 100000;
    group.frustumCulled = false;

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
        color: colors.white,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    group.add(triangleMesh);

    // Inner exclamation
    const innerExclamation = createExclamationMark(colors.orange[500]);
    innerExclamation.scale.setScalar(0.6);
    group.add(innerExclamation);

    return group;
  };

  // Decide which symbol creator to use based on intensity
  const createStressSymbol = useMemo(() => {
    switch (severityTier) {
      case 1:
        // Mild stress - simple dot
        return () => {
          const group = new THREE.Group();
          group.renderOrder = 100000;
          group.frustumCulled = false;
          const dotGeometry = new THREE.SphereGeometry(0.08, 16, 16);
          const dotMesh = new THREE.Mesh(
            dotGeometry,
            new THREE.MeshBasicMaterial({
              color: colors.white,
              transparent: true,
              opacity: 1,
              depthTest: false,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
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
  }, [severityTier]);

  // Animate the floating icon and keep it facing the camera (billboard)
  useFrame(state => {
    // Keep the outer container oriented toward the camera to prevent ellipse distortion
    if (billboardRef.current) {
      billboardRef.current.quaternion.copy(camera.quaternion);
      // Ensure it renders last to avoid being occluded by scene geometry
      billboardRef.current.renderOrder = 100000;
    }

    // Ensure the center symbol renders last among icon parts
    if (iconRef.current) {
      iconRef.current.renderOrder = 100010;
      iconRef.current.traverse(obj => {
        obj.renderOrder = 100010;
      });
    }

    if (groupRef.current && shouldShow && enabled) {
      const time = state.clock.elapsedTime;

      // Floating animation
      const floatY = Math.sin(time * 2) * 0.1;
      groupRef.current.position.y = floatY;

      // Gentle rotation for high stress
      if (stressLevel === 'high') {
        groupRef.current.rotation.z = Math.sin(time * 4) * 0.1;
      }

      // Scale pulsing based on HRV stress intensity (0..1)
      const normalized = Math.min(Math.max(stressIntensity, 0), 1);
      const pulseStrength = 0.6 + normalized * 0.6;
      const pulseScale = 1 + Math.sin(time * 3) * 0.08 * pulseStrength;
      groupRef.current.scale.setScalar(Math.max(0.8, pulseScale));
    }
  });

  if (!enabled || !shouldShow) {
    return null;
  }

  return (
    <group ref={billboardRef} position={position}>
      <group ref={groupRef}>
        {/* Invisible clickable area (larger than visual for easier tapping) */}
        <mesh position={[0, 0, 0.1]} onClick={onPress} onPointerDown={onPress}>
          <circleGeometry args={[0.4, 32]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Main circular badge background */}
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
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
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Subtle glow effect for higher stress levels */}
        {severityTier >= 2 && (
          <mesh position={[0, 0, -0.05]}>
            <circleGeometry args={[0.25, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Additional pulsing ring for high stress */}
        {severityTier === 3 && (
          <mesh position={[0, 0, -0.03]}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Symbol in the center (rendered last for top layering) */}
        <primitive
          ref={iconRef}
          object={createStressSymbol()}
          position={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

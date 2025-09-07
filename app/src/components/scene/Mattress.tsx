import { RoundedBox } from '@react-three/drei/core';
import React, { useMemo } from 'react';

export type MattressProps = {
  // World position for the mattress center
  position?: [number, number, number];
  // Mattress size in meters [width (x), height/thickness (y), length (z)]
  size?: [number, number, number];
  // Optional rotation (rarely needed)
  rotation?: [number, number, number];
  // Colors
  mattressColor?: string | number;
  sheetColor?: string | number;
  pillowColor?: string | number;
  // Lighting
  receiveShadow?: boolean;
  castShadow?: boolean;
};

/**
 * Simple low-poly mattress made from box primitives.
 * Defaults align with current Avatar sleeping placement in AvatarModel
 * (which offsets the avatar +1.0 on Z when sleeping and places ground at ~-1.7 Y).
 */
export default function Mattress({
  position = [0, -1.6, 1.0],
  size = [1.2, 0.22, 2.0],
  rotation = [0, 0, 0],
  mattressColor = '#e8e8ee',
  sheetColor = '#d7d7e6',
  pillowColor = '#ffffff',
  receiveShadow = true,
  castShadow = false,
}: MattressProps) {
  const [w, h, d] = size;

  // Slightly smaller top sheet for a subtle layered look
  const sheetSize = useMemo(
    () => [w * 0.98, h * 0.52, d * 0.98] as const,
    [w, h, d]
  );
  // Pillow dimensions (thin and wide)
  const pillowSize = useMemo(
    () => [w * 0.82, h * 1.66, d * 0.18] as [number, number, number],
    [w, h, d]
  );

  // Pillow position near "head" side (positive Z)
  const pillowPosition = useMemo(
    () =>
      [position[0], position[1] + h * 0.35, position[2] + d * 0.38] as const,
    [position, h, d]
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Base mattress */}
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        <RoundedBox args={[w, h, d]} />
        <meshStandardMaterial
          color={mattressColor}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Top sheet */}
      <mesh
        position={[0, h * 0.26, 0]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <boxGeometry args={sheetSize} />
        <meshStandardMaterial
          color={sheetColor}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Pillow */}
      <mesh
        position={[
          pillowPosition[0] - position[0],
          pillowPosition[1] - position[1],
          pillowPosition[2] - position[2],
        ]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <RoundedBox args={pillowSize} />
        <meshStandardMaterial
          color={pillowColor}
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}

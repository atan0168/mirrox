import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';

type RainParticlesProps = {
  enabled?: boolean;
  count?: number;
  area?: [number, number]; // [width, depth]
  dropHeight?: number; // spawn/reset Y height
  groundY?: number; // ground Y to reset below
  speed?: number; // base speed units/sec
  wind?: [number, number]; // wind x,z drift
  mode?: 'points' | 'streaks'; // render style
  streakLength?: number; // world units for streaks
  slantFactor?: number; // how much wind slants streak bottom (multiplier of streakLength)
  pointSize?: number; // px size for points mode
  color?: number; // particle color
  opacity?: number; // particle opacity
  lengthRange?: [number, number]; // per-drop length range (streaks only)
};

export function RainParticles({
  enabled = true,
  count = 2000,
  area = [18, 18],
  dropHeight = 10,
  groundY = -1.72,
  speed = 8,
  wind = [0.6, 0.18],
  mode = 'streaks',
  streakLength = 0.15,
  slantFactor = 1.0,
  pointSize = 2.2,
  color = 0xd0e8ff,
  opacity = 0.75,
  lengthRange,
}: RainParticlesProps) {
  const geomRef = useRef<THREE.BufferGeometry>(null!);
  const velocities = useRef<Float32Array>(new Float32Array(count));
  const lengths = useRef<Float32Array>(new Float32Array(count));

  const positions = useMemo(() => {
    const vertsPer = mode === 'streaks' ? 2 : 1;
    const pos = new Float32Array(count * vertsPer * 3);
    const v = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * area[0];
      const z = (Math.random() - 0.5) * area[1];
      const y = Math.random() * dropHeight;
      v[i] = 0.6 + Math.random(); // 0.6..1.6 speed scaler
      if (mode === 'streaks') {
        // two vertices per drop
        const len = lengthRange
          ? lengthRange[0] + Math.random() * (lengthRange[1] - lengthRange[0])
          : streakLength;
        lengths.current[i] = len;
        pos[i * 6 + 0] = x;
        pos[i * 6 + 1] = y;
        pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x;
        pos[i * 6 + 4] = y - len;
        pos[i * 6 + 5] = z;
      } else {
        pos[i * 3 + 0] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
      }
    }
    velocities.current = v;
    return pos;
  }, [
    count,
    area,
    dropHeight,
    mode,
    streakLength,
    lengthRange && lengthRange[0],
    lengthRange && lengthRange[1],
  ]);

  useEffect(() => {
    if (!geomRef.current) return;
    geomRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
  }, [positions]);

  useFrame((_state, delta) => {
    if (!enabled) return;
    const g = geomRef.current;
    if (!g) return;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const v = velocities.current!;
    if (mode === 'streaks') {
      for (let i = 0; i < count; i++) {
        let x = pos.getX(i * 2) + wind[0] * delta;
        let z = pos.getZ(i * 2) + wind[1] * delta;
        const len = lengths.current[i] || streakLength;
        let yTop = pos.getY(i * 2) - speed * v[i] * delta;
        let yBottom = yTop - len;
        if (yBottom < groundY) {
          yTop = dropHeight;
          yBottom = yTop - len;
          x = (Math.random() - 0.5) * area[0];
          z = (Math.random() - 0.5) * area[1];
        }
        // Apply slant with per-drop length
        const slantX = wind[0] * slantFactor * len;
        const slantZ = wind[1] * slantFactor * len;
        pos.setXYZ(i * 2 + 0, x, yTop, z);
        pos.setXYZ(i * 2 + 1, x + slantX, yBottom, z + slantZ);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - speed * v[i] * delta;
        let x = pos.getX(i) + wind[0] * delta;
        let z = pos.getZ(i) + wind[1] * delta;
        if (y < groundY) {
          y = dropHeight;
          x = (Math.random() - 0.5) * area[0];
          z = (Math.random() - 0.5) * area[1];
        }
        pos.setXYZ(i, x, y, z);
      }
    }
    pos.needsUpdate = true;
  });

  if (!enabled) return null;

  return mode === 'streaks' ? (
    <lineSegments>
      <bufferGeometry ref={geomRef} />
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </lineSegments>
  ) : (
    <points>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial
        color={color}
        size={pointSize}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default RainParticles;

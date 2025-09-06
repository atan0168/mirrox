import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';

type CloudProps = {
  position: [number, number, number];
  scale?: number;
  speed?: number; // drift speed along X
  direction?: 1 | -1;
  bounds?: [number, number]; // wrap X when beyond +/- bounds[0]
};

function Cloud({
  position,
  scale = 1,
  speed = 0.15,
  direction = 1,
  bounds = [12, 6],
}: CloudProps) {
  const group = React.useRef<THREE.Group>(null);
  const puffGeo = useMemo(() => new THREE.IcosahedronGeometry(0.8, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xf3f6fb,
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  );
  const offsets = useMemo<{ p: [number, number, number]; s: number }[]>(() => {
    return [
      { p: [0, 0, 0], s: 1.0 },
      { p: [0.9, 0.2, -0.1], s: 0.8 },
      { p: [-1.0, 0.1, 0.1], s: 0.9 },
      { p: [0.2, -0.1, 0.3], s: 0.7 },
    ];
  }, []);

  useFrame((_s, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.x += direction * speed * dt;
    if (g.position.x > bounds[0]) g.position.x = -bounds[0];
    if (g.position.x < -bounds[0]) g.position.x = bounds[0];
  });

  return (
    <group ref={group} position={position} scale={scale}>
      {offsets.map((o, i) => (
        <mesh
          key={i}
          geometry={puffGeo}
          position={o.p}
          scale={o.s}
          castShadow={false}
          receiveShadow={false}
        >
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export default function LowPolyClouds() {
  return (
    <group>
      {/* Positioned behind avatar, mid-height */}
      <Cloud position={[-6, 3.8, -8]} scale={1.4} speed={0.12} direction={1} />
      <Cloud position={[3, 4.3, -10]} scale={1.8} speed={0.1} direction={-1} />
      <Cloud position={[8, 3.5, -7]} scale={1.2} speed={0.16} direction={1} />
      <Cloud
        position={[-10, 5.0, -12]}
        scale={2.1}
        speed={0.09}
        direction={-1}
      />
    </group>
  );
}

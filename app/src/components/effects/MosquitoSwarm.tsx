import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

interface MosquitoSwarmProps {
  anchor?: [number, number, number];
  enabled?: boolean;
  count?: number;
  radius?: number;
  orbitSpeed?: number;
  height?: number;
}

interface MosquitoConfig {
  angleOffset: number;
  radius: number;
  bobAmplitude: number;
  bobSpeed: number;
  orbitSpeed: number;
  heightOffset: number;
}

type MosquitoGLTFResult = GLTF & { scene: THREE.Group };

const MOSQUITO_MODEL = require('../../../assets/objects/low_poly_mosquito.glb');

useGLTF.preload(MOSQUITO_MODEL);

const Mosquito = React.memo(
  ({ config, model }: { config: MosquitoConfig; model: THREE.Object3D }) => {
    const groupRef = useRef<THREE.Group>(null);

    const mosquitoModel = useMemo(() => {
      const clone = model.clone(true);
      clone.traverse(child => {
        const mesh = child as THREE.Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      return clone;
    }, [model]);

    useFrame(({ clock }) => {
      const group = groupRef.current;
      if (!group) return;

      const time = clock.getElapsedTime();
      const angle = config.angleOffset + time * config.orbitSpeed;
      const radiusPulse =
        config.radius * (1 + Math.sin(time * 1.5 + config.angleOffset) * 0.06);

      const y =
        config.heightOffset +
        Math.sin(time * config.bobSpeed + config.angleOffset) *
          config.bobAmplitude;

      group.position.set(
        Math.cos(angle) * radiusPulse,
        y,
        Math.sin(angle) * radiusPulse
      );

      group.rotation.y = -angle + Math.PI / 2;
      group.rotation.x = Math.sin(time * 1.1 + config.angleOffset) * 0.08;
    });

    return (
      <group ref={groupRef} scale={0.55}>
        <primitive object={mosquitoModel} />
      </group>
    );
  }
);
Mosquito.displayName = 'Mosquito';

export function MosquitoSwarm({
  anchor = [0, 1.1, 0],
  enabled = true,
  count = 3,
  radius = 0.9,
  orbitSpeed = 1.2,
  height = 0,
}: MosquitoSwarmProps) {
  const { scene } = useGLTF(MOSQUITO_MODEL) as MosquitoGLTFResult;

  const configs = useMemo(() => {
    const baseSeed = 137; // deterministic but non-zero seed for Math.sin variations
    return new Array(Math.max(1, count)).fill(null).map((_, index) => {
      const seed = baseSeed + index * 97;
      const rand = (multiplier: number) =>
        Math.sin(seed * multiplier) * 0.5 + 0.5; // 0..1 pseudo random

      const orbitVariation = 0.7 + rand(1.3) * 0.6;
      const bobAmplitude = 0.1 + rand(3.1) * 0.08;
      const bobSpeed = 2 + rand(2.7) * 1.4;
      const radiusJitter = radius * (rand(3.1) * 0.25 - 0.12);
      const heightOffset = height + 0.1 + rand(4.4) * 0.15;

      const config: MosquitoConfig = {
        angleOffset: (index / Math.max(1, count)) * Math.PI * 2,
        radius: Math.max(0.65, radius + radiusJitter),
        bobAmplitude,
        bobSpeed,
        orbitSpeed: orbitSpeed * orbitVariation,
        heightOffset,
      };

      return config;
    });
  }, [count, orbitSpeed, radius, height]);

  if (!enabled) {
    return null;
  }

  return (
    <group position={anchor}>
      {configs.map((config, idx) => (
        <Mosquito key={`mosquito-${idx}`} config={config} model={scene} />
      ))}
    </group>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber/native';

type CloudConfig = {
  position: [number, number, number];
  scale: number; // base scale applied to sprite (x,y scaled by aspect)
  speed: number; // units per second along X
  direction: 1 | -1; // drift left/right
};

function CloudSprite({
  texture,
  config,
  bounds = 12,
  aspect = 2.0,
  opacity = 0.85,
  zOverride,
}: {
  texture: THREE.Texture;
  config: CloudConfig;
  bounds?: number;
  aspect?: number;
  opacity?: number;
  zOverride?: number;
}) {
  const ref = useRef<THREE.Sprite>(null!);

  useFrame((_state, dt) => {
    const s = ref.current;
    if (!s) return;
    s.position.x += config.direction * config.speed * dt;
    if (s.position.x > bounds) s.position.x = -bounds;
    if (s.position.x < -bounds) s.position.x = bounds;
  });

  const [px, py, pz] = config.position;
  return (
    <sprite
      ref={ref}
      position={[px, py, zOverride ?? pz]}
      scale={[config.scale * aspect, config.scale, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        color={0xffffff}
      />
    </sprite>
  );
}

export default function SpriteClouds({
  visible = true,
  flattenZ,
}: {
  visible?: boolean;
  // If provided, forces all cloud sprites to render at this local Z
  flattenZ?: number;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load cloud texture via expo-asset
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(
          require('../../../assets/sprite/cloud.png')
        );
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const loader = new THREE.TextureLoader();
        loader.load(
          uri,
          tex => {
            if (cancelled) return;
            tex.anisotropy = 1;
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            setTexture(tex);
          },
          undefined,
          () => {
            // ignore errors, leave texture null
          }
        );
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clouds: CloudConfig[] = useMemo(
    () => [
      { position: [-6, 4.0, -9], scale: 2.2, speed: 0.08, direction: 1 },
      { position: [3, 4.5, -11], scale: 2.8, speed: 0.07, direction: -1 },
      { position: [8, 3.7, -8], scale: 1.8, speed: 0.1, direction: 1 },
      { position: [-10, 5.2, -13], scale: 3.1, speed: 0.06, direction: -1 },
    ],
    []
  );

  if (!texture) return null;

  // Assume roughly 2:1 aspect for cloud sprite; adjust if needed later
  const aspect = 2.0;

  return (
    <group visible={visible}>
      {clouds.map((c, i) => (
        <CloudSprite
          key={i}
          texture={texture}
          config={c}
          bounds={12}
          aspect={aspect}
          opacity={0.82}
          zOverride={flattenZ}
        />
      ))}
    </group>
  );
}

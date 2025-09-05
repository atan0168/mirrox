import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { TextureKey, TextureRegistry } from '../../scene/assetConfig';

type SceneFloorProps = {
  textureKey?: TextureKey;
  size?: [number, number];
  repeat?: [number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string | number;
  receiveShadow?: boolean;
};

export function SceneFloor({
  textureKey,
  size = [30, 30],
  repeat = [6, 6],
  position = [0, -1.7, 0],
  rotation = [-Math.PI / 2, 0, 0],
  color = '#d9d9d9',
  receiveShadow = true,
}: SceneFloorProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    async function load() {
      if (!textureKey) {
        setTexture(null);
        return;
      }
      try {
        const module = TextureRegistry[textureKey];
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const loader = new THREE.TextureLoader();
        loader.load(
          uri,
          t => {
            if (disposed) return;
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 1;
            t.generateMipmaps = false;
            t.minFilter = THREE.LinearFilter;
            t.magFilter = THREE.LinearFilter;
            t.repeat.set(repeat[0], repeat[1]);
            setTexture(t);
          },
          undefined,
          () => setTexture(null)
        );
      } catch {
        setTexture(null);
      }
    }
    load();
    return () => {
      disposed = true;
    };
  }, [textureKey, repeat[0], repeat[1]]);

  const planeArgs = useMemo(() => [size[0], size[1], 1, 1] as const, [size[0], size[1]]);

  return (
    <mesh position={position as any} rotation={rotation as any} receiveShadow={receiveShadow}>
      {/* @ts-ignore - react-three-fiber native type */}
      <planeGeometry args={planeArgs as any} />
      {/* @ts-ignore - react-three-fiber native type */}
      <meshStandardMaterial map={texture || undefined} color={texture ? undefined : (color as any)} roughness={1} metalness={0} />
    </mesh>
  );
}

export default SceneFloor;


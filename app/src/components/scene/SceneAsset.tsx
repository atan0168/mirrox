import { Asset } from 'expo-asset';
import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import {
  AssetRegistry,
  SceneAssetInstance,
  TextureRegistry,
} from '../../scene/assetConfig';

export type SceneAssetProps = SceneAssetInstance;

export function SceneAsset(props: SceneAssetProps) {
  const registry = AssetRegistry[props.assetKey];
  const [scene, setScene] = useState<THREE.Group | null>(null);

  // Load GLB from bundled asset
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const asset = Asset.fromModule(registry.module);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const loader = new GLTFLoader();
        await new Promise<void>((resolve, reject) => {
          loader.load(
            uri,
            (gltf: any) => {
              if (!mounted) return;
              // clone to avoid shared state when multiple instances
              const cloned = gltf.scene.clone(true);
              setScene(cloned);
              resolve();
            },
            undefined,
            e => reject(e)
          );
        });
      } catch (e) {
        console.warn('Failed to load scene asset', props.assetKey, e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [props.assetKey, registry.module]);

  // Compute transform from instance or defaults
  const transform = useMemo(() => {
    const d = registry.defaults || {};
    return {
      position: props.position ??
        (d.position as [number, number, number] | undefined) ?? [0, 0, 0],
      rotation: props.rotation ??
        (d.rotation as [number, number, number] | undefined) ?? [0, 0, 0],
      scale: props.scale ?? d.scale ?? 1,
    };
  }, [props.position, props.rotation, props.scale, registry.defaults]);

  // Apply material/texture customizations
  useEffect(() => {
    if (!scene) return;

    // Ensure shadows and basic material overrides
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = props.castShadow ?? true;
        child.receiveShadow = props.receiveShadow ?? true;

        if (props.materialOverrides && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (props.materialOverrides.color !== undefined)
            mat.color = new THREE.Color(props.materialOverrides.color);
          if (props.materialOverrides.roughness !== undefined)
            mat.roughness = props.materialOverrides.roughness;
          if (props.materialOverrides.metalness !== undefined)
            mat.metalness = props.materialOverrides.metalness;
          if (props.materialOverrides.transparent !== undefined)
            mat.transparent = props.materialOverrides.transparent;
          if (props.materialOverrides.opacity !== undefined)
            mat.opacity = props.materialOverrides.opacity;
          mat.needsUpdate = true;
        }
      }
    });

    // Apply texture if requested
    if (props.textureKey) {
      const textureModule = TextureRegistry[props.textureKey];
      const applyToAll = props.applyTexture?.toAll;
      const meshNameContains =
        props.applyTexture?.meshNameContains?.map(s => s.toLowerCase()) ?? [];
      const materialNameContains =
        props.applyTexture?.materialNameContains?.map(s => s.toLowerCase()) ??
        [];

      const texAsset = Asset.fromModule(textureModule);
      texAsset.downloadAsync().then(() => {
        const uri = texAsset.localUri || texAsset.uri;
        const loader = new THREE.TextureLoader();
        loader.load(
          uri,
          texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = 1;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;

            scene.traverse((child: any) => {
              if (child.isMesh && child.material) {
                const mat = child.material as THREE.MeshStandardMaterial;
                const matchesMesh =
                  meshNameContains.length === 0 ||
                  meshNameContains.some(s =>
                    child.name?.toLowerCase().includes(s)
                  );
                const matchesMaterial =
                  materialNameContains.length === 0 ||
                  materialNameContains.some(s =>
                    mat.name?.toLowerCase().includes(s)
                  );

                if (applyToAll || (matchesMesh && matchesMaterial)) {
                  mat.map = texture;
                  mat.needsUpdate = true;
                }
              }
            });
          },
          undefined,
          err => console.warn('Failed to load texture', err)
        );
      });
    }
  }, [
    scene,
    props.textureKey,
    JSON.stringify(props.applyTexture),
    JSON.stringify(props.materialOverrides),
    props.castShadow,
    props.receiveShadow,
  ]);

  if (!scene) return null;

  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
    >
      <primitive object={scene} />
    </group>
  );
}

export default SceneAsset;

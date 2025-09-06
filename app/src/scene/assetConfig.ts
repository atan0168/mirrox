// Static registry for local assets and textures.
// Expo/Metro requires static requires, so add new assets here.

export type TextureKey = 'sandy_gravel';

export const TextureRegistry: Record<TextureKey, any> = {
  sandy_gravel: require('../../assets/textures/sandy_gravel.jpg'),
};

export type AssetKey = 'low_poly_bonsai' | 'low_poly_rock_set';

export interface AssetDefaultPlacement {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

export const AssetRegistry: Record<
  AssetKey,
  { module: any; defaults?: AssetDefaultPlacement }
> = {
  low_poly_bonsai: {
    module: require('../../assets/objects/low_poly_bonsai.glb'),
    defaults: {
      // Place slightly behind and next to the avatar (camera looks towards z decreasing)
      position: [-1.2, 1, -0.3],
      rotation: [0, Math.PI * 0.15, 0],
      // Increase size relative to avatar
      scale: 2.4,
    },
  },
  low_poly_rock_set: {
    module: require('../../assets/objects/low_poly_rock_set.glb'),
    defaults: {
      position: [1.6, -1.65, 0.0],
      rotation: [0, -Math.PI * 0.1, 0],
      scale: 1.0,
    },
  },
};

export type SceneAssetInstance = {
  assetKey: AssetKey;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  // Optional texture application
  textureKey?: TextureKey;
  applyTexture?: {
    // Apply to all meshes in the model
    toAll?: boolean;
    // Or target specific meshes by fuzzy match on mesh or material name
    meshNameContains?: string[];
    materialNameContains?: string[];
  };
  materialOverrides?: {
    color?: number | string;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
  };
  receiveShadow?: boolean;
  castShadow?: boolean;
};

export type SceneEnvironmentConfig = {
  assets: SceneAssetInstance[];
};

// A convenient default environment using built-in assets
export const DefaultEnvironment: SceneEnvironmentConfig = {
  assets: [
    {
      assetKey: 'low_poly_bonsai',
      // use defaults
      textureKey: undefined,
      receiveShadow: true,
      castShadow: true,
    },
    {
      assetKey: 'low_poly_rock_set',
      // demonstrate applying a texture to all meshes if needed
      // textureKey: 'sandy_gravel',
      // applyTexture: { toAll: true },
      receiveShadow: true,
      castShadow: true,
    },
  ],
};

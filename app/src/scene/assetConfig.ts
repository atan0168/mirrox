// Static registry for local assets and textures.
// Expo/Metro requires static requires, so add new assets here.

export type TextureKey = 'sandy_gravel' | 'laminated_wood';

// React Native static require returns a numeric module ID
export type StaticAssetModule = number;

export const TextureRegistry: Record<TextureKey, StaticAssetModule> = {
  sandy_gravel: require('../../assets/textures/sandy_gravel.jpg'),
  laminated_wood: require('../../assets/textures/laminated_wood.jpg'),
};

export type AssetKey = '';

export interface AssetDefaultPlacement {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

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
  assets: [],
};

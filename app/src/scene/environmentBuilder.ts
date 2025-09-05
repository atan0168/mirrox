import { SceneEnvironmentConfig, SceneAssetInstance } from './assetConfig';

export type EnvironmentContext = {
  aqi?: number | null;
  sleepMinutes?: number | null;
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | null;
};

export function buildEnvironmentForContext(
  ctx: EnvironmentContext
): SceneEnvironmentConfig {
  const assets: SceneAssetInstance[] = [];

  // Always place the bonsai as a friendly element
  assets.push({
    assetKey: 'low_poly_bonsai',
    receiveShadow: true,
    castShadow: true,
  });

  // Place rocks set, optionally textured based on air quality or weather
  // const rock: SceneAssetInstance = { assetKey: 'low_poly_rock_set', receiveShadow: true, castShadow: true };
  //
  // // If AQI is unhealthy, add a sandy gravel texture to emphasize dryness/pollution
  // if (ctx.aqi != null && ctx.aqi >= 101) {
  //   rock.textureKey = 'sandy_gravel';
  //   rock.applyTexture = { toAll: true };
  // }

  // If rainy, make rocks darker and slightly glossy
  // if (ctx.weather === 'rainy') {
  //   rock.materialOverrides = {
  //     color: '#6b7280',
  //     roughness: 0.6,
  //     metalness: 0.1,
  //   };
  // }
  //
  // // If very little sleep, nudge rock position to look a bit off-balance (subtle visual cue)
  // if (ctx.sleepMinutes != null && ctx.sleepMinutes < 6 * 60) {
  //   rock.position = [1.7, -1.68, -0.1];
  // }
  //
  // assets.push(rock);

  return { assets };
}

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber/native';

export type WeatherPreset = 'sunny' | 'cloudy' | 'rainy' | 'night';

export type LightingConfig = {
  background: string;
  ambient: { intensity: number; color?: number };
  directional: {
    intensity: number;
    color: number;
    position: [number, number, number];
  };
  hemisphere: { sky: number; ground: number; intensity: number };
  fill?: {
    intensity: number;
    color: number;
    position: [number, number, number];
  };
  fog?: { color: number; near: number; far: number };
};

export function getLightingConfig(preset: WeatherPreset): LightingConfig {
  switch (preset) {
    case 'sunny':
      return {
        background: '#f6fbff',
        ambient: { intensity: 0.45 },
        directional: { color: 0xfff1d0, intensity: 2.0, position: [5, 5, 5] },
        hemisphere: { sky: 0xf6f9ff, ground: 0xfaf5e6, intensity: 0.25 },
        fill: { color: 0xfff3e0, intensity: 0.35, position: [-5, 5, 5] },
      };
    case 'cloudy':
      return {
        background: '#e3e9f2',
        ambient: { intensity: 1.2, color: 0xe3e9f2 },
        directional: { color: 0xdfe7ef, intensity: 0.9, position: [4, 6, 3] },
        hemisphere: { sky: 0xcfe0f4, ground: 0xdedede, intensity: 0.9 },
        fill: { color: 0xffffff, intensity: 0.3, position: [-4, 5, 2] },
        fog: { color: 0xdfe7ef, near: 5, far: 30 },
      };
    case 'rainy':
      return {
        background: '#cfd8dc',
        ambient: { intensity: 1.0, color: 0xcfd8dc },
        directional: { color: 0xb0bec5, intensity: 0.7, position: [2, 6, 2] },
        hemisphere: { sky: 0xb0c4d8, ground: 0x9e9e9e, intensity: 0.95 },
        fill: { color: 0x90a4ae, intensity: 0.35, position: [-3, 5, 2] },
        fog: { color: 0xb0bec5, near: 4, far: 22 },
      };
    case 'night':
      return {
        background: '#0b1020',
        ambient: { intensity: 0.45, color: 0x1e2c44 },
        directional: { color: 0xaac6ff, intensity: 0.95, position: [-2, 6, 2] },
        hemisphere: { sky: 0x1b2a40, ground: 0x0b0e16, intensity: 0.55 },
        fill: { color: 0x6ea0ff, intensity: 0.4, position: [2.5, 2.2, 1.2] },
        fog: { color: 0x0a0f1a, near: 6, far: 28 },
      };
  }
}

export function WeatherLighting({ preset }: { preset: WeatherPreset }) {
  const config = useMemo(() => getLightingConfig(preset), [preset]);
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.setClearColor(config.background);
  }, [gl, config.background]);

  useEffect(() => {
    if (config.fog) {
      scene.fog = new THREE.Fog(
        config.fog.color,
        config.fog.near,
        config.fog.far
      );
    } else {
      scene.fog = null;
    }
  }, [scene, config.fog]);

  return (
    <group>
      <ambientLight
        intensity={config.ambient.intensity}
        color={config.ambient.color}
      />
      <directionalLight
        position={config.directional.position}
        color={config.directional.color}
        intensity={config.directional.intensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {config.fill && (
        <pointLight
          position={config.fill.position}
          color={config.fill.color}
          intensity={config.fill.intensity}
        />
      )}
      <hemisphereLight
        args={[
          config.hemisphere.sky,
          config.hemisphere.ground,
          config.hemisphere.intensity,
        ]}
      />
    </group>
  );
}

export default WeatherLighting;

import * as THREE from "three";

export type ParticleGeometryGenerator = (
  index: number,
  options: { size: [number, number, number]; density: number }
) => THREE.BufferGeometry;

export type ParticleMaterialGenerator = (
  index: number,
  textures: THREE.Texture[],
  options: { opacity: number; density: number; color: THREE.Color }
) => THREE.Material;

/**
 * Returns a default particle geometry generator function for smoke.
 * This generator creates larger, varied plane geometries for realistic smoke.
 */
export const getDefaultParticleGeometryGenerator = (): ParticleGeometryGenerator => {
  const geometries: THREE.PlaneGeometry[] = [];

  return (index, { size }) => {
    if (!geometries[index]) {
      // Create varied sizes for more natural smoke
      const sizeVariation = 0.5 + Math.random() * 1.5; // 0.5x to 2x size variation
      const width = (size[0] * 0.02) * sizeVariation;
      const height = (size[1] * 0.02) * sizeVariation;
      
      geometries[index] = new THREE.PlaneGeometry(width, height);
    }

    return geometries[index];
  };
};

/**
 * Returns a default particle material generator function for smoke.
 * Creates materials optimized for background smoke effects.
 */
export const getDefaultParticleMaterialGenerator = (): ParticleMaterialGenerator => {
  const materials: THREE.MeshBasicMaterial[] = [];

  return (index, textures, { opacity, color }) => {
    if (!materials[index]) {
      const texture = textures[index % textures.length];
      
      // Create material optimized for smoke
      materials[index] = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: opacity * (0.2 + Math.random() * 0.3), // Varied opacity for depth
        color: color,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        depthWrite: false,
        alphaTest: 0.01,
        fog: true, // Allow fog to affect the material
      });
    }

    return materials[index];
  };
};
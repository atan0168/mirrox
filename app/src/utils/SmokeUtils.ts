import * as THREE from 'three';

export type ParticleGeometryGenerator = (
  index: number,
  options: { size: [number, number, number]; density: number }
) => THREE.BufferGeometry;

export type ParticleMaterialGenerator = {
  (
    index: number,
    textures: THREE.Texture[],
    options: { opacity: number; density: number; color: THREE.Color }
  ): THREE.Material;
  clearCache?: () => void;
};

/**
 * Returns a default particle geometry generator function for smoke.
 * This generator creates larger, varied plane geometries for realistic smoke.
 */
export const getDefaultParticleGeometryGenerator =
  (): ParticleGeometryGenerator => {
    const geometries: THREE.PlaneGeometry[] = [];

    return (index, { size }) => {
      if (!geometries[index]) {
        // Create varied sizes for more natural smoke
        const sizeVariation = 0.5 + Math.random() * 1.5; // 0.5x to 2x size variation
        const width = size[0] * 0.02 * sizeVariation;
        const height = size[1] * 0.02 * sizeVariation;

        geometries[index] = new THREE.PlaneGeometry(width, height);
      }

      return geometries[index];
    };
  };

/**
 * Returns a default particle material generator function for smoke.
 * Creates materials optimized for background smoke effects.
 */
export const getDefaultParticleMaterialGenerator =
  (): ParticleMaterialGenerator => {
    const materials: THREE.MeshBasicMaterial[] = [];

    const generator = (index: number, textures: THREE.Texture[], { opacity, color }: { opacity: number; color: THREE.Color }) => {
      // Always create fresh materials to avoid caching issues with opacity changes
      const texture = textures[index % textures.length];

      // Use deterministic "random" variation based on index for consistent behavior
      const randomVariation = 0.2 + (Math.sin(index * 0.1) * 0.5 + 0.5) * 0.3;

      // Dispose of existing material if it exists
      if (materials[index]) {
        materials[index].dispose();
      }

      // Create material optimized for smoke
      materials[index] = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: opacity * randomVariation, // Varied opacity for depth
        color: color,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        depthWrite: false,
        alphaTest: 0.01,
        fog: true, // Allow fog to affect the material
      });

      // Store the variation factor for later use
      materials[index].userData = { opacityVariation: randomVariation };

      return materials[index];
    };

    // Add a method to clear the cache
    generator.clearCache = () => {
      materials.forEach(material => {
        if (material) material.dispose();
      });
      materials.length = 0;
    };

    return generator;
  };

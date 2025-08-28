import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';
import {
  getDefaultParticleGeometryGenerator,
  getDefaultParticleMaterialGenerator,
} from '../../utils/SmokeUtils';

interface SmogControllerProps {
  enabled: boolean;
  intensity?: number;
  windStrength?: number;
  density?: number;
  enableTurbulence?: boolean;
  turbulenceStrength?: [number, number, number];
  enableWind?: boolean;
  windDirection?: [number, number, number];
  maxVelocity?: [number, number, number];
  minBounds?: [number, number, number];
  maxBounds?: [number, number, number];
  size?: [number, number, number];
  opacity?: number;
  color?: THREE.Color;
}

export function SmogController({
  enabled,
  intensity = 1.0,
  windStrength = 0.5,
  density = 50,
  enableTurbulence = true,
  turbulenceStrength = [0.01, 0.01, 0.01],
  enableWind = true,
  windDirection = [1, 0, 0],
  maxVelocity = [30, 30, 0],
  minBounds = [-8, -2, -8],
  maxBounds = [8, 6, 8],
  size = [100, 100, 100],
  opacity = 0.5,
  color = new THREE.Color(0xffffff),
}: SmogControllerProps) {
  const { scene, camera } = useThree();
  const particlesRef = useRef<THREE.Mesh[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // Load the smoke texture
  const smokeTexture = useLoader(
    THREE.TextureLoader,
    require('../../../assets/smoke-default.png')
  ) as THREE.Texture;

  // Frustum culling utilities
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const boundingBox = useMemo(() => new THREE.Box3(), []);
  const tempVec3 = useMemo(() => new THREE.Vector3(), []);

  // Use the utility generators
  const particleGeometry = useMemo(
    () => getDefaultParticleGeometryGenerator(),
    []
  );
  const particleMaterial = useMemo(
    () => getDefaultParticleMaterialGenerator(),
    []
  );

  // Generate particles (similar to react-smoke)
  const particles = useMemo(() => {
    const smokeParticles: THREE.Mesh[] = [];
    for (let p = 0; p < density; p++) {
      const particle = new THREE.Mesh();
      smokeParticles.push(particle);
    }
    return smokeParticles;
  }, [density]);

  // Initialize particles when enabled
  useEffect(() => {
    if (enabled) {
      // Clear material cache to ensure fresh materials with correct opacity
      if (particleMaterial.clearCache) {
        particleMaterial.clearCache();
      }

      // Clean up existing particles first if they exist
      if (groupRef.current && groupRef.current.children.length > 0) {
        groupRef.current.children.forEach(child => {
          const particle = child as THREE.Mesh;
          if (particle.geometry) particle.geometry.dispose();
          if (particle.material) {
            const material = particle.material;
            if (Array.isArray(material)) {
              material.forEach(m => m.dispose());
            } else {
              material.dispose();
            }
          }
        });
        groupRef.current.clear();
      }

      // Create group if it doesn't exist
      if (!groupRef.current) {
        groupRef.current = new THREE.Group();
        // Position the group behind the avatar
        groupRef.current.position.set(0, 0, -2);
      }
      // Ensure the group is attached to the scene
      if (groupRef.current.parent !== scene) {
        scene.add(groupRef.current);
      }

      // Initialize particles (always reinitialize to ensure fresh state)
      // Initialize particle geometries and materials
      for (let p = 0; p < particles.length; p++) {
        const particle = particles[p];
        particle.geometry = particleGeometry(p, { size, density });
        particle.material = particleMaterial(p, [smokeTexture], {
          opacity: opacity * intensity,
          density,
          color,
        });

        // Create layered background smoke positioning
        const layer = Math.floor(p / (density / 3)); // 3 layers
        const layerOffset = layer * 2; // Spread layers apart

        // Position particles in a more natural smoke pattern
        const angle = (p / density) * Math.PI * 4 + Math.random() * Math.PI;
        const radius = 3 + Math.random() * 4 + layerOffset;
        const height =
          minBounds[1] + Math.random() * (maxBounds[1] - minBounds[1]);

        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
        const y = height;
        const z =
          Math.sin(angle) * radius + (Math.random() - 0.5) * 2 - layerOffset;

        particle.position.set(x, y, z);

        // Set coordinated, slow movement - all particles move in similar direction
        const baseDirection = new THREE.Vector3(0.1, 0.2, 0.05); // Main drift direction
        const variation = 0.3; // Small random variation

        particle.userData.velocity = new THREE.Vector3(
          baseDirection.x + (Math.random() - 0.5) * variation,
          baseDirection.y + (Math.random() - 0.5) * variation * 0.5,
          baseDirection.z + (Math.random() - 0.5) * variation
        );

        // Set initial turbulence if enabled
        if (enableTurbulence) {
          particle.userData.turbulence = new THREE.Vector3(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI
          );
        }

        // Make particles face the camera initially
        particle.lookAt(camera.position);

        groupRef.current.add(particle);
      }

      particlesRef.current = particles;
    } else {
      // Clean up when disabled
      if (groupRef.current) {
        scene.remove(groupRef.current);
        groupRef.current.clear();
        groupRef.current = null;
        particlesRef.current = [];
      }
      
      // Clear material cache when disabled
      if (particleMaterial.clearCache) {
        particleMaterial.clearCache();
      }
    }

    return () => {
      // Cleanup on dependency change/unmount
      if (groupRef.current) {
        scene.remove(groupRef.current);
        particles.forEach(particle => {
          if (particle.geometry) particle.geometry.dispose();
          const material = particle.material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else if (material) {
            material.dispose();
          }
        });
        // Ensure we recreate and reattach the group on next effect run
        groupRef.current = null;
        particlesRef.current = [];
      }

      // Clear material cache on unmount or re-init
      if (particleMaterial.clearCache) {
        particleMaterial.clearCache();
      }
    };
  }, [
    enabled,
    particles,
    scene,
    particleGeometry,
    particleMaterial,
    maxBounds,
    minBounds,
    enableTurbulence,
    smokeTexture,
    size,
    density,
    camera,
    color,
  ]);


  // Animation loop for background smoke effect
  useFrame((state, delta) => {
    if (!enabled || !particlesRef.current || !groupRef.current) return;

    const time = state.clock.elapsedTime;

    particlesRef.current.forEach((particle, index) => {
      const velocity: THREE.Vector3 = particle.userData.velocity;
      const turbulence = particle.userData.turbulence;

      // Apply very gentle turbulence for subtle natural movement
      if (enableTurbulence && turbulence) {
        const turbulenceForce = 0.0005; // Even gentler turbulence
        tempVec3.set(
          Math.sin(time * 0.2 + turbulence.x) * turbulenceForce,
          Math.sin(time * 0.1 + turbulence.y) * turbulenceForce,
          Math.cos(time * 0.15 + turbulence.z) * turbulenceForce
        );
        velocity.add(tempVec3);
      }

      // Apply very gentle wind effect for coordinated movement
      if (enableWind) {
        const windForce = windStrength * 0.0003; // Much gentler wind
        velocity.x += windDirection[0] * windForce;
        velocity.y += windDirection[1] * windForce * 0.3; // Even less vertical wind
        velocity.z += windDirection[2] * windForce;
      }

      // Apply stronger drag to keep movement slow and steady
      velocity.multiplyScalar(0.995);

      // Apply velocity with slower time-based scaling
      particle.position.add(
        tempVec3
          .set(velocity.x, velocity.y, velocity.z)
          .multiplyScalar(delta * 20)
      );

      // Keep particles facing the camera for billboard effect
      particle.lookAt(camera.position);

      // Gentle bounds checking - respawn particles that drift too far
      const [minX, minY, minZ] = minBounds;
      const [maxX, maxY, maxZ] = maxBounds;

      if (particle.position.y > maxY + 2) {
        // Respawn at bottom with new random position
        const layer = Math.floor(index / (density / 3));
        const layerOffset = layer * 2;
        const angle = (index / density) * Math.PI * 4 + Math.random() * Math.PI;
        const radius = 3 + Math.random() * 4 + layerOffset;

        particle.position.set(
          Math.cos(angle) * radius + (Math.random() - 0.5) * 2,
          minY - 1,
          Math.sin(angle) * radius + (Math.random() - 0.5) * 2 - layerOffset
        );

        // Reset velocity with coordinated movement
        const baseDirection = new THREE.Vector3(0.1, 0.2, 0.05);
        const variation = 0.3;

        velocity.set(
          baseDirection.x + (Math.random() - 0.5) * variation,
          baseDirection.y + (Math.random() - 0.5) * variation * 0.5,
          baseDirection.z + (Math.random() - 0.5) * variation
        );
      }

      // Fade particles based on distance from avatar and apply intensity
      const distanceFromCenter = particle.position.distanceTo(
        new THREE.Vector3(0, 0, 0)
      );
      const maxDistance = 12;
      const fadeStart = 8;

      const material = particle.material as THREE.MeshBasicMaterial;
      const randomVariation = material.userData?.opacityVariation || 1.0;
      let finalOpacity = opacity * intensity * 0.5 * randomVariation;

      if (distanceFromCenter > fadeStart) {
        const fadeRatio = Math.max(
          0,
          1 - (distanceFromCenter - fadeStart) / (maxDistance - fadeStart)
        );
        finalOpacity *= fadeRatio;
      }

      material.opacity = finalOpacity;
    });

    // Very slowly rotate the entire smoke system for subtle movement
    groupRef.current.rotation.y += 0.0001;
  });

  return null;
}

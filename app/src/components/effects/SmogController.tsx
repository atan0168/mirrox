import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";

interface SmogControllerProps {
  enabled: boolean;
}

export function SmogController({ enabled }: SmogControllerProps) {
  const { scene } = useThree();
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particlesRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  
  // Create a circular texture for round particles using Three.js DataTexture
  const createCircleTexture = () => {
    const size = 64;
    const data = new Uint8Array(size * size * 4); // RGBA
    
    const center = size / 2;
    const radius = center;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const distance = Math.sqrt((i - center) ** 2 + (j - center) ** 2);
        const alpha = Math.max(0, 1 - (distance / radius));
        
        const index = (i * size + j) * 4;
        data[index] = 255;     // R
        data[index + 1] = 255; // G
        data[index + 2] = 255; // B
        data[index + 3] = Math.floor(alpha * 255); // A
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  };
  
  useEffect(() => {
    if (enabled && !particleSystemRef.current) {
      // Create particle geometry
      const particleCount = 800;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      // Generate particles in a box around the avatar
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Position particles around the avatar
        positions[i3] = (Math.random() - 0.5) * 8; // X
        positions[i3 + 1] = Math.random() * 6 - 1; // Y (from -1 to 5)
        positions[i3 + 2] = (Math.random() - 0.5) * 8; // Z
        
        // Grayish smoke colors with some variation
        const grayVariation = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        colors[i3] = grayVariation;     // R
        colors[i3 + 1] = grayVariation; // G
        colors[i3 + 2] = grayVariation; // B
        
        // Varying particle sizes
        sizes[i] = Math.random() * 0.15 + 0.08; // 0.08 to 0.23
      }
      
      // Create geometry and set attributes
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Create circular texture for round particles
      const circleTexture = createCircleTexture();
      
      // Create material with the circular texture
      const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: circleTexture,
        alphaTest: 0.1,
      });
      
      // Create particle system
      const particles = new THREE.Points(geometry, material);
      scene.add(particles);
      
      particleSystemRef.current = particles;
      particlesRef.current = geometry;
      materialRef.current = material;
      
    } else if (!enabled && particleSystemRef.current) {
      // Remove particles when disabled
      scene.remove(particleSystemRef.current);
      particleSystemRef.current.geometry.dispose();
      if (particleSystemRef.current.material instanceof THREE.Material) {
        particleSystemRef.current.material.dispose();
      }
      particleSystemRef.current = null;
      particlesRef.current = null;
      materialRef.current = null;
    }
    
    return () => {
      // Cleanup on unmount
      if (particleSystemRef.current) {
        scene.remove(particleSystemRef.current);
        particleSystemRef.current.geometry.dispose();
        if (particleSystemRef.current.material instanceof THREE.Material) {
          particleSystemRef.current.material.dispose();
        }
      }
    };
  }, [enabled, scene]);
  
  // Animate particles
  useFrame((state) => {
    if (particleSystemRef.current && particlesRef.current && enabled) {
      const positions = particlesRef.current.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      // Animate particles with floating motion
      for (let i = 0; i < positions.length; i += 3) {
        const particleIndex = i / 3;
        
        // Gentle floating motion
        positions[i] += Math.sin(time + particleIndex * 0.01) * 0.001; // X drift
        positions[i + 1] += 0.005; // Slow upward drift
        positions[i + 2] += Math.cos(time + particleIndex * 0.01) * 0.001; // Z drift
        
        // Reset particles that float too high
        if (positions[i + 1] > 6) {
          positions[i + 1] = -1;
          positions[i] = (Math.random() - 0.5) * 8;
          positions[i + 2] = (Math.random() - 0.5) * 8;
        }
      }
      
      particlesRef.current.attributes.position.needsUpdate = true;
      
      // Slowly rotate the entire particle system for more natural movement
      particleSystemRef.current.rotation.y += 0.001;
    }
  });
  
  return null;
}

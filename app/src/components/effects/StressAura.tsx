import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

interface StressAuraProps {
  intensity: number; // 0-1, where 1 is maximum stress
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  enabled?: boolean;
}

export function StressAura({
  intensity,
  stressLevel,
  enabled = true,
}: StressAuraProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Create particle-based stress aura
  const particleSystem = useMemo(() => {
    if (!enabled || stressLevel === 'none') return null;

    const particles: THREE.Points[] = [];
    const particleCount = 150; // Reduced for better performance
    const layers = 3; // Multiple layers for depth

    for (let layer = 0; layer < layers; layer++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const alphas = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount); // For animation offset

      // Generate particles in a spherical distribution
      for (let i = 0; i < particleCount; i++) {
        const radius = 2.5 + layer * 0.8 + Math.random() * 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        sizes[i] = 0.1 + Math.random() * 0.3;
        alphas[i] = 0.3 + Math.random() * 0.4;
        phases[i] = Math.random() * Math.PI * 2;
      }

      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: intensity },
          color: { value: new THREE.Color() },
          opacity: { value: 0.0 },
        },
        vertexShader: `
          uniform float time;
          uniform float intensity;
          
          attribute float size;
          attribute float alpha;
          attribute float phase;
          
          varying float vAlpha;
          
          void main() {
            vAlpha = alpha;
            
            vec3 pos = position;
            
            // Add gentle floating motion
            pos.y += sin(time * 0.5 + phase) * 0.2;
            pos.x += cos(time * 0.3 + phase) * 0.1;
            
            // Pulsing effect
            float pulse = sin(time * 2.0 + phase) * 0.5 + 0.5;
            float finalSize = size * (0.8 + pulse * 0.4) * intensity;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = finalSize * (300.0 / -mvPosition.z);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float opacity;
          
          varying float vAlpha;
          
          void main() {
            // Create circular particles
            float dist = length(gl_PointCoord - 0.5);
            if (dist > 0.5) discard;
            
            // Soft edges
            float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
            alpha *= vAlpha * opacity;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false,
      });

      const points = new THREE.Points(geometry, material);
      particles.push(points);
    }

    return particles;
  }, [enabled, stressLevel]);

  // Update colors and opacity based on stress level
  useMemo(() => {
    if (!particleSystem) return;

    let color: THREE.Color;
    let targetOpacity: number;

    switch (stressLevel) {
      case 'none':
        color = new THREE.Color(0x4caf50); // Green
        targetOpacity = 0.0;
        break;
      case 'mild':
        color = new THREE.Color(0xffc107); // Yellow
        targetOpacity = 0.3;
        break;
      case 'moderate':
        color = new THREE.Color(0xff9800); // Orange
        targetOpacity = 0.5;
        break;
      case 'high':
        color = new THREE.Color(0xf44336); // Red
        targetOpacity = 0.7;
        break;
      default:
        color = new THREE.Color(0x4caf50);
        targetOpacity = 0.0;
    }

    particleSystem.forEach(points => {
      const material = points.material as THREE.ShaderMaterial;
      material.uniforms.color.value = color;
      material.uniforms.opacity.value = targetOpacity;
      material.uniforms.intensity.value = intensity;
    });
  }, [stressLevel, intensity, particleSystem]);

  // Animate the particles
  useFrame(state => {
    if (particleSystem && enabled) {
      particleSystem.forEach(points => {
        const material = points.material as THREE.ShaderMaterial;
        material.uniforms.time.value = state.clock.elapsedTime;

        // Gentle rotation
        points.rotation.y += 0.002;
        points.rotation.x += 0.001;
      });
    }
  });

  if (!enabled || stressLevel === 'none' || !particleSystem) {
    return null;
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {particleSystem.map((points, index) => (
        <primitive key={index} object={points} />
      ))}
    </group>
  );
}

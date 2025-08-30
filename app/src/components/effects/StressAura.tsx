import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

interface StressAuraProps {
  intensity: number; // 0-1, where 1 is maximum stress
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  congestionFactor?: number;
  enabled?: boolean;
}

export function StressAura({
  intensity,
  stressLevel,
  congestionFactor = 1.0,
  enabled = true,
}: StressAuraProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create custom shader material for the stress aura
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: intensity },
        congestionFactor: { value: congestionFactor },
        color: { value: new THREE.Color() },
        opacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          
          // Add some vertex displacement for pulsing effect
          vec3 pos = position;
          float pulse = sin(time * 3.0) * 0.1 * intensity;
          pos += normal * pulse;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform float congestionFactor;
        uniform vec3 color;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          // Create radial gradient from center
          float dist = length(vUv - 0.5) * 2.0;
          
          // Create pulsing effect
          float pulse = sin(time * 4.0 + dist * 10.0) * 0.5 + 0.5;
          
          // Create wave effect based on congestion factor
          float wave = sin(time * 2.0 + vPosition.y * 5.0) * 0.3 + 0.7;
          
          // Combine effects
          float alpha = (1.0 - dist) * intensity * opacity * pulse * wave;
          alpha = smoothstep(0.0, 1.0, alpha);
          
          // Add some noise for more organic look
          float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
          alpha *= (0.8 + noise * 0.2);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Update material uniforms based on stress level
  useMemo(() => {
    if (!shaderMaterial) return;

    let color: THREE.Color;
    let targetOpacity: number;

    switch (stressLevel) {
      case 'none':
        color = new THREE.Color(0x4CAF50); // Green
        targetOpacity = 0.0;
        break;
      case 'mild':
        color = new THREE.Color(0xFFC107); // Yellow
        targetOpacity = 0.2;
        break;
      case 'moderate':
        color = new THREE.Color(0xFF9800); // Orange
        targetOpacity = 0.4;
        break;
      case 'high':
        color = new THREE.Color(0xF44336); // Red
        targetOpacity = 0.6;
        break;
      default:
        color = new THREE.Color(0x4CAF50);
        targetOpacity = 0.0;
    }

    shaderMaterial.uniforms.color.value = color;
    shaderMaterial.uniforms.opacity.value = targetOpacity;
    shaderMaterial.uniforms.intensity.value = intensity;
    shaderMaterial.uniforms.congestionFactor.value = congestionFactor;
  }, [stressLevel, intensity, congestionFactor, shaderMaterial]);

  // Animate the aura
  useFrame((state) => {
    if (materialRef.current && enabled) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  if (!enabled || stressLevel === 'none') {
    return null;
  }

  // Calculate aura size based on stress level
  const getAuraSize = () => {
    switch (stressLevel) {
      case 'mild': return 3.5;
      case 'moderate': return 4.0;
      case 'high': return 4.5;
      default: return 3.0;
    }
  };

  const auraSize = getAuraSize();

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[auraSize, auraSize, auraSize]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={shaderMaterial} ref={materialRef} />
    </mesh>
  );
}
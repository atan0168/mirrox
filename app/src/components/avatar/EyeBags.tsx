import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';

interface EyeBagsProps {
  target: THREE.Object3D | null; // typically head mesh
  enabled: boolean;
  intensity?: number; // 0..1
  offsetX?: number; // eye horizontal offset from head center
  offsetY?: number; // vertical offset from eye line
  offsetZ?: number; // forward offset to avoid z-fighting
  width?: number; // plane width
  height?: number; // plane height
  aspectX?: number; // elliptic stretch on X (wider = more oval)
}

// Simple radial-alpha shader for soft, dark under-eye circles
const EyeBagMaterial = (
  color: THREE.Color | string | number,
  opacity: number
) => {
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uRadius: { value: 0.5 },
    uSoftness: { value: 0.45 },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uRadius;
      uniform float uSoftness;
      void main() {
        // Centered radial falloff for soft edges
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edge = smoothstep(uRadius, uRadius - uSoftness, r);
        float a = edge * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  return mat;
};

export default function EyeBags({
  target,
  enabled,
  intensity = 0.6,
  offsetX = -0.035,
  offsetY = 0.065,
  offsetZ = 0.11,
  width = 0.1,
  height = 0.065,
  aspectX = 1.6,
}: EyeBagsProps) {
  const containerRef = useRef<THREE.Group | null>(null);
  const leftRef = useRef<THREE.Mesh | null>(null);
  const rightRef = useRef<THREE.Mesh | null>(null);
  const geomRef = useRef<THREE.PlaneGeometry | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  // Clamp intensity and derive opacity
  const clamped = Math.max(0, Math.min(1, intensity));
  const opacity = 0.35 + clamped * 0.4; // 0.35..0.75

  // Create or update material
  useEffect(() => {
    if (!matRef.current) {
      matRef.current = EyeBagMaterial('#2b1f1f', opacity);
      matRef.current.side = THREE.DoubleSide;
      // Make it feel like part of the skin by using depth testing and multiply blending
      matRef.current.depthTest = true;
      matRef.current.depthWrite = false;
      matRef.current.transparent = true;
      matRef.current.blending = THREE.MultiplyBlending;
      matRef.current.premultipliedAlpha = true;
      // Slight polygon offset to sit just above the skin and avoid z-fighting
      matRef.current.polygonOffset = true;
      matRef.current.polygonOffsetFactor = -1;
      matRef.current.polygonOffsetUnits = -1;
      matRef.current.needsUpdate = true;
    } else if (matRef.current.uniforms?.uOpacity) {
      matRef.current.uniforms.uOpacity.value = opacity;
    }
  }, [opacity]);

  // Ensure geometry exists and matches width/height
  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.dispose();
      geomRef.current = null;
    }
    geomRef.current = new THREE.PlaneGeometry(width, height, 1, 1);
    if (leftRef.current) leftRef.current.geometry = geomRef.current;
    if (rightRef.current) rightRef.current.geometry = geomRef.current;
  }, [width, height]);

  // Attach container to head target imperatively
  useEffect(() => {
    if (!enabled || !target) return;

    if (!containerRef.current) containerRef.current = new THREE.Group();
    const container = containerRef.current;

    if (!leftRef.current) {
      leftRef.current = new THREE.Mesh(
        geomRef.current || new THREE.PlaneGeometry(width, height, 1, 1),
        matRef.current || EyeBagMaterial('#2b1f1f', opacity)
      );
      // Normal render order to let depth test handle occlusion
      container.add(leftRef.current);
    }
    if (!rightRef.current) {
      rightRef.current = new THREE.Mesh(
        geomRef.current || new THREE.PlaneGeometry(width, height, 1, 1),
        matRef.current || EyeBagMaterial('#2b1f1f', opacity)
      );
      // Normal render order to let depth test handle occlusion
      container.add(rightRef.current);
    }

    // Add to head
    target.add(container);

    // Initial placement scaled by head bounds
    try {
      const box = new THREE.Box3().setFromObject(target);
      const size = new THREE.Vector3();
      box.getSize(size);
      const headW = size.x || 0.18;
      const headH = size.y || 0.24;
      const headD = size.z || 0.16;

      const dx = offsetX || headW * 0.28;
      const dy = offsetY || -headH * 0.1;
      const dz = offsetZ || headD * 0.12;
      if (leftRef.current) leftRef.current.position.set(-dx, dy, dz);
      if (rightRef.current) rightRef.current.position.set(dx, dy, dz);
    } catch {}

    return () => {
      if (container.parent) container.parent.remove(container);
    };
  }, [enabled, target]);

  // Live offset updates
  useEffect(() => {
    if (!enabled) return;
    if (leftRef.current)
      leftRef.current.position.set(-offsetX, offsetY, offsetZ);
    if (rightRef.current)
      rightRef.current.position.set(offsetX, offsetY, offsetZ);
  }, [enabled, offsetX, offsetY, offsetZ]);

  // Slightly squash/extend on X to form an oval shadow
  useEffect(() => {
    if (leftRef.current) leftRef.current.scale.set(aspectX, 1, 1);
    if (rightRef.current) rightRef.current.scale.set(aspectX, 1, 1);
  }, [aspectX]);

  // Imperative attachment only; no JSX needed
  return null;
}

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';
import SceneFloor from './SceneFloor';

/**
 * Home Scene (Prototype)
 * Purpose: Provide a safe / comfort baseline with morning and evening variants.
 * Visual goals (initial pass):
 *  - Interior floor + walls suggestion (minimal geometry)
 *  - Window with animated outside light color (time-of-day)
 *  - Simple plant sway (comfort / life)
 *  - Digital clock block updating minute indicator (no text geometry for perf)
 *  - Lamp that toggles emissive bulb + area glow shell
 *  - Kettle steam placeholder when active
 *
 * Interactivity props (lifted to parent for now):
 *  - timeOfDay: 'morning' | 'evening' | 'day' | 'night'
 *  - windowOpen: boolean (future: add outside ambient audio bleed)
 *  - lampOn: boolean
 *  - kettleActive: boolean
 *  - applianceActivity: 0..1 (future blending of subtle motions / particles)
 */
export type HomeTimeOfDay = 'morning' | 'evening' | 'day' | 'night';

export interface SceneHomeProps {
  timeOfDay?: HomeTimeOfDay;
  windowOpen?: boolean;
  lampOn?: boolean;
  kettleActive?: boolean;
  applianceActivity?: number; // reserved for future fine-grained ambient motion
  groundY?: number;
}

// Derived light colors per time-of-day for window glow
const WINDOW_LIGHT: Record<HomeTimeOfDay, THREE.ColorRepresentation> = {
  morning: '#fff5d1',
  day: '#f0f6ff',
  evening: '#ffd4a8',
  night: '#1e2a46',
};

const AMBIENT_INTENSITY: Record<HomeTimeOfDay, number> = {
  morning: 0.75,
  day: 1.0,
  evening: 0.6,
  night: 0.25,
};

export default function SceneHome({
  timeOfDay = 'morning',
  windowOpen = false,
  lampOn = true,
  kettleActive = false,
  applianceActivity = 0,
  groundY = -1.72,
}: SceneHomeProps) {
  // Plant sway (simple harmonic motion)
  const plantRef = useRef<THREE.Group>(null);
  // Steam particles simple billboards
  const steamRef = useRef<THREE.Group>(null);
  const clockRef = useRef<THREE.Mesh>(null);

  // Precompute steam puff offsets
  const steamPuffs = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      seed: i,
      base: new THREE.Vector3(
        (Math.random() - 0.5) * 0.12,
        Math.random() * 0.05,
        (Math.random() - 0.5) * 0.12
      ),
    }));
  }, []);

  useFrame((state, delta) => {
    // Plant sway
    if (plantRef.current) {
      const t = state.clock.elapsedTime;
      const sway = Math.sin(t * 0.9) * 0.07 + Math.sin(t * 0.53) * 0.04;
      plantRef.current.rotation.z = sway;
    }
    // Steam rise
    if (steamRef.current && kettleActive) {
      steamRef.current.children.forEach((child, idx) => {
        const m = child as THREE.Mesh;
        const speed = 0.22 + (idx % 5) * 0.02;
        m.position.y += speed * delta;
        const mat = m.material as THREE.Material & { opacity?: number };
        if (typeof mat.opacity === 'number') {
          mat.opacity = Math.max(0, 0.6 - m.position.y * 0.5);
        }
        if (m.position.y > 1.4) {
          m.position.y = 0;
          const mat2 = m.material as THREE.Material & { opacity?: number };
          if (typeof mat2.opacity === 'number') {
            mat2.opacity = 0.6;
          }
        }
      });
    }
    // Clock minute pulse (scale bounce each new minute)
    if (clockRef.current) {
      const now = new Date();
      const seconds = now.getSeconds();
      const sPhase = (seconds % 60) / 60; // 0..1
      const scale = 1 + Math.sin(sPhase * Math.PI) * 0.1;
      clockRef.current.scale.set(scale, scale, scale);
    }
  });

  const windowColor = WINDOW_LIGHT[timeOfDay];
  const ambient = AMBIENT_INTENSITY[timeOfDay];

  return (
    <group>
      {/* Ambient fill responsive to time-of-day */}
      <ambientLight intensity={ambient * 0.5 + (lampOn ? 0.15 : 0)} />

      <SceneFloor textureKey="laminated_wood" />
      {/* Floor (simple plane) */}
      {/* <mesh */}
      {/*   position={[0, groundY - 0.001, 0]} */}
      {/*   rotation={[-Math.PI / 2, 0, 0]} */}
      {/*   receiveShadow */}
      {/* > */}
      {/*   <planeGeometry args={[10, 10]} /> */}
      {/*   <meshStandardMaterial color={'#ececec'} roughness={1} metalness={0} /> */}
      {/* </mesh> */}

      {/* Back wall */}
      <mesh position={[0, groundY + 1.2, -3.2]} receiveShadow castShadow>
        <boxGeometry args={[10, 10, 0.2]} />
        <meshStandardMaterial color={'#acc2d9'} roughness={1} metalness={0} />
      </mesh>

      {/* Side walls (subtle) */}
      {[-1, 1].map(sign => (
        <mesh key={sign} position={[sign * 5, groundY + 1.2, -0.4]}>
          <boxGeometry args={[0.2, 4, 6]} />
          <meshStandardMaterial
            color={'#f7f9fc'}
            roughness={1}
            metalness={0}
            opacity={0.95}
            transparent
          />
        </mesh>
      ))}

      {/* Window frame */}
      <group position={[0, groundY + 3.4, -3.11]}>
        <mesh>
          <boxGeometry args={[3.6, 2.2, 0.12]} />
          <meshStandardMaterial
            color={'#d9dde3'}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Glass inset representing outside light */}
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[3.2, 1.8]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowColor}
            emissiveIntensity={timeOfDay === 'night' ? 0.15 : 0.55}
            roughness={0.9}
            metalness={0}
            transparent
            opacity={windowOpen ? 0.4 : 0.85}
          />
        </mesh>
      </group>

      {/* Simple outside parallax panel (changes color subtly) */}
      <mesh position={[0, groundY + 1.4, -6.8]}>
        <planeGeometry args={[7, 3]} />
        <meshStandardMaterial color={windowOpen ? '#b7d5ff' : '#a9c9ef'} />
      </mesh>

      {/* Plant (simple stalk + leaves) */}
      <group position={[-1.8, groundY, -0.8]} ref={plantRef}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 1.2, 8]} />
          <meshStandardMaterial color={'#7a5a3b'} roughness={1} />
        </mesh>
        {[0.4, 0.7, 1.0].map((h, i) => (
          <mesh
            key={i}
            position={[0, h, 0]}
            rotation={[0, 0, (i - 1) * 0.3]}
            castShadow
          >
            <sphereGeometry args={[0.25 - i * 0.04, 10, 10]} />
            <meshStandardMaterial color={'#5cab5c'} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Lamp */}
      <group position={[1.9, groundY, 0.4]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.4, 10]} />
          <meshStandardMaterial
            color={'#b8bcc2'}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow>
          <coneGeometry args={[0.38, 0.5, 16]} />
          <meshStandardMaterial
            color={'#e1e5ea'}
            roughness={0.85}
            metalness={0.1}
          />
        </mesh>
        {/* Bulb */}
        <group position={[0, 1.25, 0]}>
          <mesh visible={lampOn}>
            <sphereGeometry args={[0.18, 14, 14]} />
            <meshStandardMaterial
              color={'#fffdf8'}
              emissive={'#ffe9b5'}
              emissiveIntensity={lampOn ? 2.2 : 0}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          {lampOn && (
            <mesh scale={[1.5, 1.2, 1.5]} renderOrder={2}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshBasicMaterial
                color={'#ffe2a0'}
                transparent
                opacity={0.25}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}
          {lampOn && (
            <pointLight
              position={[0, 0.05, 0]}
              color={'#ffd8a0'}
              intensity={4}
              distance={6}
              decay={2}
            />
          )}
        </group>
      </group>

      {/* Kettle on side table */}
      <group position={[1.1, groundY, -1.2]}>
        <mesh position={[0, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 0.68, 16]} />
          <meshStandardMaterial
            color={'#dadfe4'}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0.32, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshStandardMaterial color={'#a4a9af'} roughness={0.9} />
        </mesh>
        {/* Handle */}
        <mesh position={[-0.32, 0.5, 0]} castShadow>
          <torusGeometry args={[0.16, 0.04, 8, 16]} />
          <meshStandardMaterial color={'#a4a9af'} roughness={0.9} />
        </mesh>
        {/* Steam group */}
        <group ref={steamRef} position={[0, 0.78, 0]}>
          {kettleActive &&
            steamPuffs.map(p => (
              <mesh key={p.seed} position={p.base.clone()}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshBasicMaterial
                  color={'#ffffff'}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            ))}
        </group>
      </group>

      {/* Digital clock: simple cube whose emissive intensity varies by time-of-day */}
      <group position={[-1.1, groundY + 0.25, 0.9]}>
        <mesh ref={clockRef} castShadow>
          <boxGeometry args={[0.6, 0.25, 0.2]} />
          <meshStandardMaterial
            color={'#1e293b'}
            emissive={timeOfDay === 'night' ? '#334155' : '#1e293b'}
            emissiveIntensity={timeOfDay === 'night' ? 0.6 : 0.25}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Glow element to simulate digits */}
        <mesh position={[0, 0.01, 0.105]}>
          <planeGeometry args={[0.5, 0.16]} />
          <meshBasicMaterial
            color={'#6ee7b7'}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';
import SceneFloor from './SceneFloor';
import { useHomeSceneStore } from '../../store/homeSceneStore';

/**
 * Home Scene (Prototype)
 * Purpose: Provide a safe / comfort baseline with morning and evening variants.
 * Visual goals (initial pass):
 *  - Interior floor + walls suggestion (minimal geometry)
 *  - Window with animated outside light color (time-of-day)
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

// Sky gradient colors per time-of-day (top & bottom)
const SKY_COLORS: Record<HomeTimeOfDay, { top: string; bottom: string }> = {
  morning: { top: '#fdd9a1', bottom: '#fff6e6' },
  day: { top: '#6fb3ff', bottom: '#cfe7ff' },
  evening: { top: '#ff9c5b', bottom: '#ffe2c4' },
  night: { top: '#0d182b', bottom: '#1e3250' },
};

// Seven-segment digit mapping (segments a-g)
const DIGIT_SEGMENTS: Record<number, string[]> = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'],
  1: ['b', 'c'],
  2: ['a', 'b', 'g', 'e', 'd'],
  3: ['a', 'b', 'g', 'c', 'd'],
  4: ['f', 'g', 'b', 'c'],
  5: ['a', 'f', 'g', 'c', 'd'],
  6: ['a', 'f', 'g', 'e', 'c', 'd'],
  7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  9: ['a', 'b', 'c', 'd', 'f', 'g'],
};

export default function SceneHome({
  applianceActivity = 0,
  groundY = -1.72,
}: SceneHomeProps) {
  const timeOfDay = useHomeSceneStore(s => s.timeOfDay);
  const windowOpen = useHomeSceneStore(s => s.windowOpen);
  const lampOn = useHomeSceneStore(s => s.lampOn);
  const kettleActive = useHomeSceneStore(s => s.kettleActive);

  // Steam particles simple billboards
  const steamRef = useRef<THREE.Group>(null);
  const clockRef = useRef<THREE.Mesh>(null);
  const colonTopRef = useRef<THREE.Mesh>(null);
  const colonBottomRef = useRef<THREE.Mesh>(null);

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

  useFrame((_state, delta) => {
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
    const now = new Date();
    const seconds = now.getSeconds();
    if (clockRef.current) {
      const sPhase = (seconds % 60) / 60; // 0..1
      const scale = 1 + Math.sin(sPhase * Math.PI) * 0.1;
      clockRef.current.scale.set(scale, scale, scale);
    }
    // Colon blink (visible on even seconds)
    const visible = seconds % 2 === 0;
    const setColonOpacity = (mesh?: THREE.Mesh | null) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.Material & { opacity?: number };
      if (typeof mat.opacity === 'number') {
        mat.opacity = visible ? 0.85 : 0.15;
      }
    };
    setColonOpacity(colonTopRef.current);
    setColonOpacity(colonBottomRef.current);
  });

  const windowColor = WINDOW_LIGHT[timeOfDay];
  const ambient = AMBIENT_INTENSITY[timeOfDay];
  const { top: skyTop, bottom: skyBottom } = SKY_COLORS[timeOfDay];

  // Seven segment digit group factory
  const Digit = ({
    value,
    position = [0, 0, 0] as [number, number, number],
  }: {
    value: number;
    position?: [number, number, number];
  }) => {
    const active = DIGIT_SEGMENTS[value] || [];
    const segColor = '#6ee7b7';
    const offOpacity = 0.08;
    const onOpacity = 0.9;
    // segment size base
    const w = 0.04; // segment thickness
    const l = 0.1; // segment length
    const z = 0.21; // slight in front of body
    const segments = [
      { id: 'a', pos: [0, l + w * 0.5, z], rot: 0, horiz: true },
      { id: 'b', pos: [l * 0.5 + w * 0.5, l * 0.5, z], rot: 0, horiz: false },
      { id: 'c', pos: [l * 0.5 + w * 0.5, -l * 0.5, z], rot: 0, horiz: false },
      { id: 'd', pos: [0, -(l + w * 0.5), z], rot: 0, horiz: true },
      {
        id: 'e',
        pos: [-(l * 0.5 + w * 0.5), -l * 0.5, z],
        rot: 0,
        horiz: false,
      },
      {
        id: 'f',
        pos: [-(l * 0.5 + w * 0.5), l * 0.5, z],
        rot: 0,
        horiz: false,
      },
      { id: 'g', pos: [0, 0, z], rot: 0, horiz: true },
    ];
    return (
      <group position={position}>
        {segments.map(s => (
          <mesh key={s.id} position={s.pos as [number, number, number]}>
            <boxGeometry args={s.horiz ? [l, w, 0.01] : [w, l, 0.01]} />
            <meshBasicMaterial
              color={segColor}
              transparent
              opacity={active.includes(s.id) ? onOpacity : offOpacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    );
  };

  // Derive current time digits
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const h1 = Math.floor(hours / 10);
  const h2 = hours % 10;
  const m1 = Math.floor(minutes / 10);
  const m2 = minutes % 10;

  return (
    <group>
      {/* Ambient fill responsive to time-of-day */}
      <ambientLight intensity={ambient * 0.5 + (lampOn ? 0.15 : 0)} />

      <SceneFloor textureKey="laminated_wood" />

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

      {/* Window frame & glass */}
      <group position={[0.0, groundY + 3.4, -3.11]}>
        <mesh>
          <boxGeometry args={[3.6, 2.2, 0.12]} />
          <meshStandardMaterial
            color={'#d9dde3'}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[3.2, 1.8]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowColor}
            emissiveIntensity={timeOfDay === 'night' ? 0.12 : 0.5}
            roughness={0.85}
            metalness={0}
            transparent
            opacity={windowOpen ? 0.35 : 0.8}
          />
        </mesh>
        {/* Faint reflection overlay intensifies when lamp on and window closed */}
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[3.2, 1.8]} />
          <meshBasicMaterial
            color={'#ffffff'}
            transparent
            opacity={lampOn && !windowOpen ? 0.05 : 0.015}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Outside hybrid scene */}
      <group position={[0, groundY + 3.4, -6.5]}>
        {/* Sky gradient (two layered planes) */}
        <mesh position={[0, 0, -0.25]}>
          <planeGeometry args={[6.5, 3.6]} />
          <meshBasicMaterial color={skyTop} />
        </mesh>
        <mesh position={[0, 0, -0.24]}>
          <planeGeometry args={[6.5, 3.6]} />
          <meshBasicMaterial color={skyBottom} transparent opacity={0.85} />
        </mesh>

        {/* Sun / Moon */}
        {timeOfDay !== 'night' && (
          <mesh position={[1.3, 0.7, -0.26]}>
            <circleGeometry args={[0.28, 24]} />
            <meshBasicMaterial color={'#ffe9b5'} transparent opacity={0.9} />
          </mesh>
        )}
        {timeOfDay === 'night' && (
          <mesh position={[-0.9, 0.5, -0.26]}>
            <circleGeometry args={[0.22, 24]} />
            <meshBasicMaterial color={'#e2ecf7'} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Silhouette strip */}
        <group position={[0, -0.2, -0.23]}>
          {Array.from({ length: 9 }).map((_, i) => {
            const w2 = 0.5 + (i % 3) * 0.15;
            const h2 = 0.4 + ((i * 37) % 5) * 0.12;
            const x = -3 + i * 0.75;
            return (
              <mesh key={i} position={[x, h2 * 0.5 - 0.6, 0]}>
                <boxGeometry args={[w2, h2, 0.05]} />
                <meshStandardMaterial
                  color={timeOfDay === 'night' ? '#1d2433' : '#3a4a5c'}
                  roughness={1}
                />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* Plant (simple stalk + leaves) */}
      <group position={[-2.2, groundY, -2.0]} scale={2.5}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.1, 8]} />
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

      {/* Table with lamp & clock */}
      <group position={[0.6, groundY, -1.25]} scale={1.5}>
        {/* Table top */}
        <mesh position={[0, 1.1 - 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.08, 0.9]} />
          <meshStandardMaterial
            color={'#d2b48c'}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>
        {/* Table legs */}
        {[
          [-0.9, 1.1 / 2, -0.45],
          [0.9, 1.1 / 2, -0.45],
          [-0.9, 1.1 / 2, 0.45],
          [0.9, 1.1 / 2, 0.45],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} castShadow>
            <boxGeometry args={[0.08, 1.1, 0.08]} />
            <meshStandardMaterial
              color={'#b08968'}
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
        ))}

        {/* Clock body */}
        <group position={[0.5, 1.1 + 0.1, 0.1]}>
          <mesh ref={clockRef} castShadow>
            <boxGeometry args={[0.7, 0.32, 0.25]} />
            <meshStandardMaterial
              color={'#1e293b'}
              emissive={timeOfDay === 'night' ? '#334155' : '#1e293b'}
              emissiveIntensity={timeOfDay === 'night' ? 0.5 : 0.25}
              roughness={0.7}
              metalness={0.2}
            />
          </mesh>
          {/* Seven-seg digits */}
          <group position={[-0.3, 0.04, 0]} scale={0.7}>
            <Digit value={h1} position={[0, 0, 0]} />
            <Digit value={h2} position={[0.22, 0, 0]} />
            {/* Colon */}
            <group position={[0.4, 0, 0.1]}>
              {[-0.08, 0.08].map((y, i) => (
                <mesh
                  key={i}
                  ref={i === 0 ? colonTopRef : colonBottomRef}
                  position={[0, y, 0]}
                >
                  <boxGeometry args={[0.06, 0.06, 0.21]} />
                  <meshBasicMaterial
                    color={'#6ee7b7'}
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              ))}
            </group>
            <Digit value={m1} position={[0.58, 0, 0]} />
            <Digit value={m2} position={[0.8, 0, 0]} />
          </group>
        </group>

        {/* Kettle on side table */}
        <group position={[-0.8, 1.1, -0.2]} scale={0.4}>
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.4, 0.68, 8]} />
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
      </group>

      {/* (Removed old ground-level digital clock; now on table) */}
    </group>
  );
}

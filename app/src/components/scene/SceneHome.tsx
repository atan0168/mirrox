import React, { useMemo, useRef } from 'react';
import RainParticles from '../effects/RainParticles';
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
 * Interactivity (from store):
 *  - timeOfDay: 'morning' | 'evening' | 'day' | 'night'
 *  - lampOn: boolean (boosts reflection)
 *  - kettleActive: boolean (steam)
 *  - rainy: exterior localized rain through window
 */
export type HomeTimeOfDay = 'morning' | 'evening' | 'day' | 'night';

export interface SceneHomeProps {
  groundY?: number;
  rainy?: boolean;
  rainIntensity?: number; // slider 0..1
  rainDirection?: 'vertical' | 'angled';
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

// Window + wall layout constants
const WINDOW_WIDTH = 3.2;
const WINDOW_HEIGHT = 1.8;
const WINDOW_GROUP_Y_OFFSET = 3.4; // world Y = groundY + this
const BACK_WALL_Z = -3.4;
const FRAME_Z = -3.32;
const GLASS_Z = -3.38; // behind frame, in front of exterior
const PANEL_DEPTH = 0.18;
const TOTAL_WALL_WIDTH = 10; // spans between side walls at +/-5 x

export default function SceneHome({
  groundY = -1.72,
  rainy = false,
  rainIntensity = 0.6,
  rainDirection = 'vertical',
}: SceneHomeProps) {
  const timeOfDay = useHomeSceneStore(s => s.timeOfDay);
  const lampOn = useHomeSceneStore(s => s.lampOn);
  const kettleActive = useHomeSceneStore(s => s.kettleActive);
  const toggleLamp = useHomeSceneStore(s => s.toggleLamp);

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
    const nowTime = new Date();
    const seconds = nowTime.getSeconds();
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
  const isNight = timeOfDay === 'night';

  // Glass & reflection dynamics
  const baseGlassOpacity = isNight ? 0.14 : 0.1;
  const glassOpacity = rainy ? baseGlassOpacity * 1.15 : baseGlassOpacity;
  const reflectionStrength =
    ((lampOn ? 0.2 : 0.12) + (isNight ? 0.05 : 0)) * (rainy ? 0.25 : 1);

  // Rain intensity mapping (home localized rain)
  const rI = Math.min(1, Math.max(0, rainIntensity));
  const streakCount = Math.round(200 + rI * 400);
  const streakSpeed = 6 + rI * 4;
  const windVec: [number, number] =
    rainDirection === 'angled' ? [0.18 + 0.25 * rI, 0.03 + 0.04 * rI] : [0, 0];
  const slantFactor = rainDirection === 'angled' ? 0.6 + 0.4 * rI : 0;
  const lengthRange: [number, number] = [0.07 + rI * 0.05, 0.14 + rI * 0.08];
  const dropHeight = 1.6 + rI * 0.9;
  const groundRainY = -0.95; // relative inside rain group space

  // Geometry helpers
  const leftPanelWidth = (TOTAL_WALL_WIDTH - WINDOW_WIDTH) / 2; // 3.4
  const rightPanelWidth = leftPanelWidth;
  const yWindowCenter = groundY + WINDOW_GROUP_Y_OFFSET;
  const yWindowBottom = yWindowCenter - WINDOW_HEIGHT / 2; // groundY + 2.5
  const yWindowTop = yWindowCenter + WINDOW_HEIGHT / 2; // groundY + 4.3
  const wallHeight = 7.8; // ensures wall reaches window top
  const wallCenterY = groundY + wallHeight / 2;
  const sillHeight = 5.5;
  const headerHeight = 5.5;

  // Derive current time digits (evaluated per render once; minute pulse handled in frame)
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const h1 = Math.floor(hours / 10);
  const h2 = hours % 10;
  const m1 = Math.floor(minutes / 10);
  const m2 = minutes % 10;

  // Seven segment digit
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

  // Simple wall light switch component
  const LightSwitch = ({
    position = [0, 0, 0] as [number, number, number],
  }) => {
    // Visuals
    const plateColor = '#e6ebf1';
    const switchColor = lampOn ? '#34d399' : '#94a3b8';
    const leverY = lampOn ? 0.035 : -0.035; // up/down

    return (
      <group position={position}>
        {/* Invisible, slightly larger hit area for easier tapping */}
        <mesh
          onClick={toggleLamp}
          onPointerDown={toggleLamp}
          position={[0, 0, 0.03]}
        >
          <boxGeometry args={[0.22, 0.34, 0.08]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* Switch plate */}
        <mesh position={[0, 0, 0.01]} castShadow>
          <boxGeometry args={[0.18, 0.3, 0.02]} />
          <meshStandardMaterial
            color={plateColor}
            roughness={1}
            metalness={0}
          />
        </mesh>

        {/* Toggle lever */}
        <mesh position={[0, leverY, 0.025]} castShadow>
          <boxGeometry args={[0.06, 0.12, 0.02]} />
          <meshStandardMaterial
            color={switchColor}
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* Ambient fill responsive to time-of-day */}
      <ambientLight
        intensity={ambient * 0.5 + (lampOn ? (isNight ? 2.7 : 0.15) : 0)}
      />

      <SceneFloor textureKey="laminated_wood" />

      {/* Back wall composite panels (Option B) */}
      <group>
        {/* Left side panel */}
        <mesh
          position={[
            -(WINDOW_WIDTH / 2 + leftPanelWidth / 2),
            wallCenterY,
            BACK_WALL_Z,
          ]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[leftPanelWidth, wallHeight, PANEL_DEPTH]} />
          <meshStandardMaterial color={'#eef2f5'} roughness={1} metalness={0} />
        </mesh>
        {/* Right side panel */}
        <group>
          {/* Panel geometry */}
          <mesh
            position={[
              WINDOW_WIDTH / 2 + rightPanelWidth / 2,
              wallCenterY,
              BACK_WALL_Z,
            ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[rightPanelWidth, wallHeight, PANEL_DEPTH]} />
            <meshStandardMaterial
              color={'#eef2f5'}
              roughness={1}
              metalness={0}
            />
          </mesh>

          {/* Light switch mounted on right panel (approx. chest height) */}
          <LightSwitch
            position={[
              // Slightly inset from the inner edge of the right panel
              WINDOW_WIDTH / 2 + rightPanelWidth / 2 - 1.0,
              Math.max(groundY + 3.2, yWindowBottom - 0.3),
              BACK_WALL_Z + PANEL_DEPTH / 2 + 0.02,
            ]}
          />
        </group>
        {/* Bottom sill panel */}
        <mesh
          position={[0, yWindowBottom - sillHeight / 2, BACK_WALL_Z]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[WINDOW_WIDTH, sillHeight, PANEL_DEPTH]} />
          <meshStandardMaterial color={'#eef2f5'} roughness={1} metalness={0} />
        </mesh>
        {/* Top header panel */}
        <mesh
          position={[0, yWindowTop + headerHeight / 2, BACK_WALL_Z]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[WINDOW_WIDTH, headerHeight, PANEL_DEPTH]} />
          <meshStandardMaterial color={'#e7ecf1'} roughness={1} metalness={0} />
        </mesh>
      </group>

      {/* Window frame bars */}
      <group position={[0, yWindowCenter, FRAME_Z]}>
        {/* Top */}
        <mesh position={[0, WINDOW_HEIGHT / 2 + 0.06, 0]}>
          <boxGeometry args={[WINDOW_WIDTH + 0.2, 0.12, 0.12]} />
          <meshStandardMaterial color={'#d4d9e0'} />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -(WINDOW_HEIGHT / 2 + 0.06), 0]}>
          <boxGeometry args={[WINDOW_WIDTH + 0.2, 0.12, 0.12]} />
          <meshStandardMaterial color={'#d4d9e0'} />
        </mesh>
        {/* Left */}
        <mesh position={[-(WINDOW_WIDTH / 2 + 0.06), 0, 0]}>
          <boxGeometry args={[0.12, WINDOW_HEIGHT + 0.24, 0.12]} />
          <meshStandardMaterial color={'#d4d9e0'} />
        </mesh>
        {/* Right */}
        <mesh position={[WINDOW_WIDTH / 2 + 0.06, 0, 0]}>
          <boxGeometry args={[0.12, WINDOW_HEIGHT + 0.24, 0.12]} />
          <meshStandardMaterial color={'#d4d9e0'} />
        </mesh>
      </group>

      {/* Glass */}
      <group>
        <mesh position={[0, yWindowCenter, GLASS_Z]} renderOrder={5}>
          <planeGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT]} />
          <meshStandardMaterial
            color={windowColor}
            transparent
            opacity={glassOpacity}
            roughness={0}
            metalness={0}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
        {/* Reflection overlay (subtle, additive) */}
        <mesh position={[0, yWindowCenter, GLASS_Z + 0.001]} renderOrder={6}>
          <planeGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT]} />
          <meshBasicMaterial
            color={'#ffffff'}
            transparent
            opacity={reflectionStrength}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Outside hybrid scene */}
      <group position={[0, yWindowCenter, -6.5]} renderOrder={1}>
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

        {/* Localized exterior rain (only when rainy) */}
        {rainy && rI > 0 && (
          <group position={[0, 0.05, -0.05]} renderOrder={3}>
            {/* Primary streak layer */}
            <RainParticles
              enabled
              mode="streaks"
              count={streakCount}
              area={[5.2, 1.2]}
              dropHeight={dropHeight}
              groundY={groundRainY}
              speed={streakSpeed}
              wind={windVec}
              lengthRange={lengthRange}
              slantFactor={slantFactor}
              color={0xaacfe6}
              opacity={0.95}
            />
          </group>
        )}
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

      {/* (Old ground-level clock removed; now on table) */}
    </group>
  );
}

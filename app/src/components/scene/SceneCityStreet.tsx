import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber/native';

type SceneCityStreetProps = {
  groundY?: number;
  streetWidth?: number;
  streetLength?: number;
  buildingOffsetX?: number;
  // Lamp tuning
  lampIntensity?: number;
  lampDistance?: number;
  lampColor?: string | number;
};

function SkyDome({
  radius = 200,
  bottomColor = '#eef3f7',
  topColor = '#9bbce0',
}: {
  radius?: number;
  bottomColor?: string;
  topColor?: string;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 32, 18);
    const colors: number[] = [];
    const bottom = new THREE.Color(bottomColor);
    const top = new THREE.Color(topColor);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / radius; // -1..1
      // Gentle smoothstep for natural gradient, brighter near horizon
      let t = (y + 0.05) / 1.25; // shift so horizon is near 0
      t = Math.min(1, Math.max(0, t));
      t = t * t * (3 - 2 * t); // smoothstep
      const c = bottom.clone().lerp(top, t);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [radius, bottomColor, topColor]);

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial vertexColors={true} side={THREE.BackSide} />
    </mesh>
  );
}

function Building({
  position,
  size = [2, 10, 2] as [number, number, number],
  color = '#374151',
  towardsX = -1 as -1 | 1, // which side faces the road; -1 means windows on -X face
}: {
  position: [number, number, number];
  size?: [number, number, number];
  color?: string;
  towardsX?: -1 | 1;
}) {
  const [w, h, d] = size;
  const winCols = 3;
  const winRows = Math.max(4, Math.floor(h / 1.2));
  const winSize = 0.28;
  const winGapX = (d * 0.8) / (winCols - 1);
  const winGapY = (h * 0.8) / (winRows - 1);
  const startZ = -((winCols - 1) * winGapX) / 2;
  const startY = -h / 2 + 0.9; // start a bit above ground

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Windows grid on the face towards the road */}
      {Array.from({ length: winRows * winCols }).map((_, idx) => {
        const r = Math.floor(idx / winCols);
        const c = idx % winCols;
        const y = startY + r * winGapY;
        const z = startZ + c * winGapX;
        const x = (w / 2 + 0.02) * towardsX;
        return (
          <mesh key={idx} position={[x, y, z]} castShadow>
            {/* Thin box so it reads well regardless of view angle */}
            <boxGeometry args={[0.04, winSize, winSize]} />
            <meshStandardMaterial
              color={'#fefce8'}
              emissive={'#fde68a'}
              emissiveIntensity={1.2}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function MovingLights({
  laneX = [-0.6, 0.6] as [number, number],
  zRange = [-20, 20] as [number, number],
  y = -1.6,
  speed = 6,
  countPerLane = 3,
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lights = useMemo(() => {
    const arr: { lane: number; z: number; color: THREE.Color; dir: 1 | -1 }[] =
      [];
    for (let i = 0; i < countPerLane; i++) {
      // Left lane -> towards camera, Right lane -> away
      arr.push({
        lane: 0,
        z: zRange[0] + (i / countPerLane) * (zRange[1] - zRange[0]),
        color: new THREE.Color('#fca5a5'),
        dir: 1,
      });
      arr.push({
        lane: 1,
        z: zRange[1] - (i / countPerLane) * (zRange[1] - zRange[0]),
        color: new THREE.Color('#a7f3d0'),
        dir: -1,
      });
    }
    return arr;
  }, [countPerLane, zRange]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const children = groupRef.current.children as THREE.Mesh[];
    for (let i = 0; i < children.length; i++) {
      const mesh = children[i];
      const dir = i % 2 === 0 ? 1 : -1; // alternate
      mesh.position.z += dir * speed * delta;
      if (mesh.position.z > zRange[1]) mesh.position.z = zRange[0];
      if (mesh.position.z < zRange[0]) mesh.position.z = zRange[1];
    }
  });

  return (
    <group ref={groupRef}>
      {lights.map((l, idx) => (
        <mesh key={idx} position={[laneX[l.lane], y + 0.05, l.z]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color={l.color}
            emissive={l.color}
            emissiveIntensity={2.2}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SceneCityStreet({
  groundY = -1.72,
  streetWidth = 4,
  streetLength = 60,
  buildingOffsetX = 5.5,
  lampIntensity = 2.4,
  lampDistance = 7,
  lampColor = '#ffd9a8',
}: SceneCityStreetProps) {
  const laneMarkings = useMemo(() => {
    // Single dashed center line along the street
    const segments: {
      position: [number, number, number];
      size: [number, number];
    }[] = [];
    const step = 3;
    for (let z = -streetLength / 2; z < streetLength / 2; z += step) {
      segments.push({ position: [0, groundY + 0.011, z], size: [0.1, 0.9] });
    }
    return segments;
  }, [groundY, streetLength]);

  return (
    <group>
      {/* Sky dome gradient */}
      <SkyDome bottomColor="#eef3f7" topColor="#9bbce0" />
      {/* City ground plane to fill outside the road */}
      <mesh
        position={[0, groundY - 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[streetWidth * 8, streetLength * 2]} />
        <meshStandardMaterial color="#eef2f5" roughness={1} metalness={0} />
      </mesh>
      {/* Road */}
      <mesh
        position={[0, groundY, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {/* Swap dims so length runs along Z axis */}
        <planeGeometry args={[streetWidth, streetLength]} />
        <meshStandardMaterial color="#1f2937" roughness={1} metalness={0} />
      </mesh>

      {/* Lane markings */}
      {laneMarkings.map((seg, i) => (
        <mesh key={i} position={seg.position} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={seg.size} />
          <meshStandardMaterial
            color="#fcd34d"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      ))}

      {[1, -1].map(side => (
        <mesh
          key={side}
          position={[0, groundY + 0.005, (streetWidth / 2 + 0.6) * side]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[streetWidth * 0.85, streetLength]} />
          <meshStandardMaterial color="#9ca3af" roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* Buildings rows */}
      {[-1, 1].map(sign => (
        <group key={sign} position={[buildingOffsetX * sign, 0, 0]}>
          {[...Array(6)].map((_, i) => {
            const height = 6 + (i % 3) * 2.2; // taller buildings
            const z = -18 + i * 6.5;
            return (
              <Building
                key={i}
                position={[0, groundY + height / 2, z]}
                size={[2.2, height, 2.2]}
                towardsX={-sign as -1 | 1}
                color={sign > 0 ? '#4b5563' : '#334155'}
              />
            );
          })}
        </group>
      ))}

      {/* Street lamps along sidewalks */}
      {[-1, 1].map(sign => (
        <group key={`lamps-${sign}`}>
          {[-18, -6, 6, 18].map((z, i) => (
            <StreetLamp
              key={`lamp-${sign}-${i}`}
              position={[sign * (streetWidth / 2 + 0.6), groundY, z]}
              sideSign={(sign * -1) as 1 | -1}
              intensity={lampIntensity}
              distance={lampDistance}
              color={lampColor}
            />
          ))}
        </group>
      ))}

      {/* Car light streaks */}
      <MovingLights zRange={[-streetLength / 2, streetLength / 2]} />
    </group>
  );
}

function StreetLamp({
  position,
  sideSign = 1 as 1 | -1,
  height = 3.2,
  intensity = 2.4,
  distance = 7,
  color = '#ffd9a8',
}: {
  position: [number, number, number];
  sideSign?: 1 | -1;
  height?: number;
  intensity?: number;
  distance?: number;
  color?: string | number;
}) {
  const [x, y, z] = position;
  const poleTopY = y + height / 2;
  const headX = x + sideSign * 0.5;
  const headY = y + height - 0.15;

  return (
    <group>
      {/* Pole */}
      <mesh position={[x, poleTopY, z]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, height, 10]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Arm */}
      <mesh position={[(x + headX) / 2, headY, z]} castShadow>
        <boxGeometry args={[Math.abs(headX - x), 0.05, 0.05]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Lamp shade to reduce perfect circle look */}
      <mesh position={[headX - sideSign * 0.05, headY + 0.07, z]} castShadow>
        <coneGeometry args={[0.22, 0.1, 18]} />
        <meshStandardMaterial color="#707983" roughness={0.8} metalness={0.4} />
      </mesh>

      {/* Lamp bulb (faceted) with soft additive glow shell */}
      <group position={[headX, headY, z]}>
        <mesh scale={[1.0, 0.82, 1.0]} castShadow>
          <icosahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial
            color={'#fff7ed'}
            emissive={'#fde68a'}
            emissiveIntensity={intensity >= 3.5 ? 3.0 : 1.6}
            roughness={0.25}
            metalness={0.05}
          />
        </mesh>
        <mesh scale={[1.28, 1.0, 1.22]} renderOrder={2}>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshBasicMaterial
            color={new THREE.Color(color)}
            transparent
            opacity={intensity >= 3.5 ? 0.22 : 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      <pointLight
        position={[headX, headY, z]}
        color={new THREE.Color(color)}
        intensity={intensity}
        distance={distance}
        decay={2}
      />
    </group>
  );
}

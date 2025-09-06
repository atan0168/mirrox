import React from 'react';
import * as THREE from 'three';

type TreeProps = {
  position: [number, number, number];
  scale?: number;
};

function LowPolyTree({ position, scale = 1 }: TreeProps) {
  const trunkHeight = 1.2 * scale;
  const trunkRadius = 0.1 * scale;
  const foliageScale = 0.6 * scale;

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh castShadow receiveShadow position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry
          args={[trunkRadius * 0.7, trunkRadius, trunkHeight, 6]}
        />
        <meshStandardMaterial color="#7a5a3b" roughness={1} metalness={0} />
      </mesh>

      {/* Foliage - simple stacked icosahedrons */}
      {[0, 1, 2].map(i => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[0, trunkHeight + i * (0.35 * foliageScale), 0]}
          scale={foliageScale * (1 - i * 0.12)}
        >
          <icosahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial
            color={i === 0 ? '#6fbf73' : i === 1 ? '#5eac64' : '#559b5a'}
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
      ))}
    </group>
  );
}

function Shrub({ position, scale = 0.5 }: TreeProps) {
  return (
    <mesh castShadow receiveShadow position={position} scale={scale}>
      <icosahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color="#7ccf7d" roughness={0.95} metalness={0} />
    </mesh>
  );
}

type SceneZenParkProps = {
  groundRadius?: number;
  groundColorCenter?: string | number;
  groundColorEdge?: string | number;
  groundY?: number;
};

export function SceneZenPark({
  groundRadius = 26,
  groundColorCenter = '#bfe7a6',
  groundColorEdge = '#a7d88c',
  groundY = -1.72,
}: SceneZenParkProps) {
  // Simple radial gradient on the ground via vertex colors
  const segments = 48;
  const radius = groundRadius;

  // Create vertices and colors for a circle-like disc
  const geometry = React.useMemo(() => {
    const geo = new THREE.CircleGeometry(radius, segments);
    // Compute radial color gradient
    const colors: number[] = [];
    const center = new THREE.Color(groundColorCenter);
    const edge = new THREE.Color(groundColorEdge);

    // For each vertex, mix colors based on distance from center
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = Math.min(1, Math.sqrt(x * x + y * y) / radius);
      const c = center.clone().lerp(edge, t);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [radius, segments, groundColorCenter, groundColorEdge]);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, groundY, 0]} receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial vertexColors={true} roughness={1} metalness={0} />
      </mesh>

      {/* Trees arranged around and behind the avatar focus */}
      <LowPolyTree position={[3.7, groundY, -11.0]} scale={2.0} />
      <LowPolyTree position={[-2.2, groundY, -6.0]} scale={3.0} />

      {/* Shrubs for interest near the rocks/bonsai */}
      <Shrub position={[-1.0, groundY + 0.1, -0.6]} scale={0.45} />
      <Shrub position={[1.1, groundY + 0.1, -3.0]} scale={0.5} />
      <Shrub position={[0.8, groundY + 0.1, 0.9]} scale={0.42} />
    </group>
  );
}

export default SceneZenPark;

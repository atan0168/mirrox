import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useAvatarStore } from '../../store/avatarStore';
import { AVATAR_DEBUG } from '../../constants';

type EyeBagShaderMaterial = THREE.ShaderMaterial & {
  uniforms: {
    intensity: { value: number };
    aspect: { value: number };
    softness: { value: number };
    verticalShift: { value: number };
    color: { value: THREE.Color };
  };
};

type EyeBagMesh = THREE.Mesh<THREE.PlaneGeometry, EyeBagShaderMaterial>;

interface EyeBagsState {
  left: { mesh: EyeBagMesh; parent: THREE.Object3D };
  right: { mesh: EyeBagMesh; parent: THREE.Object3D };
}

const EYE_BAG_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EYE_BAG_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float intensity;
  uniform float aspect;
  uniform float softness;
  uniform float verticalShift;
  uniform vec3 color;

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - vec2(0.5, verticalShift);
    centered.x *= aspect;
    centered.y = max(centered.y, -0.3);

    float radial = length(centered);
    float radialMask = 1.0 - smoothstep(0.22, 0.68, radial * softness);

    float lowerFade = smoothstep(0.08, 0.7, uv.y);
    float upperFade = 1.0 - smoothstep(0.82, 0.98, uv.y);

    float mask = clamp(radialMask * lowerFade * upperFade, 0.0, 1.0);
    float alpha = intensity * mask;

    if (alpha <= 0.001) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

const EYE_BONE_HINTS: Record<'left' | 'right', string[]> = {
  left: [
    'Eye_L',
    'LeftEye',
    'eyeLeft',
    'eye_left',
    'Wolf3D_EyeLeft',
    'mixamorigLeftEye',
    'LeftEye_Bone',
  ],
  right: [
    'Eye_R',
    'RightEye',
    'eyeRight',
    'eye_right',
    'Wolf3D_EyeRight',
    'mixamorigRightEye',
    'RightEye_Bone',
  ],
};

const HEAD_BONE_HINTS = [
  'Head',
  'Wolf3D_Head',
  'mixamorigHead',
  'HeadTop_End',
  'Armature_Head',
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const createEyeBagMaterial = (): EyeBagShaderMaterial => {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: EYE_BAG_VERTEX_SHADER,
    fragmentShader: EYE_BAG_FRAGMENT_SHADER,
    uniforms: {
      intensity: { value: 0 },
      aspect: { value: 1.0 },
      softness: { value: 1.35 },
      verticalShift: { value: 0.6 },
      color: { value: new THREE.Color(0.18, 0.13, 0.15) },
    },
  });

  material.name = 'AvatarEyeBagMaterial';
  return material as EyeBagShaderMaterial;
};

const findHeadBone = (skeleton: THREE.Skeleton): THREE.Bone | null => {
  for (const hint of HEAD_BONE_HINTS) {
    const direct = skeleton.bones.find(b => b.name === hint);
    if (direct) return direct;
  }

  return (
    skeleton.bones.find(bone => bone.name?.toLowerCase?.().includes('head')) ||
    null
  );
};

const findEyeBone = (
  skeleton: THREE.Skeleton,
  side: 'left' | 'right'
): THREE.Bone | null => {
  for (const hint of EYE_BONE_HINTS[side]) {
    const direct = skeleton.bones.find(b => b.name === hint);
    if (direct) return direct;
  }

  const fallback = skeleton.bones.find(bone => {
    const name = bone.name?.toLowerCase?.();
    if (!name || !name.includes('eye')) return false;
    if (side === 'left' && name.includes('right')) return false;
    if (side === 'right' && name.includes('left')) return false;
    if (name.includes(side)) return true;
    return side === 'left'
      ? name.endsWith('_l') || name.endsWith('.l')
      : name.endsWith('_r') || name.endsWith('.r');
  });

  return fallback || null;
};

interface EyeBagsProps {
  headMesh: THREE.SkinnedMesh | null;
}

export function EyeBags({ headMesh }: EyeBagsProps) {
  const eyeBagsOverrideEnabled = useAvatarStore(
    state => state.eyeBagsOverrideEnabled
  );
  const eyeBagsAutoEnabled = useAvatarStore(state => state.eyeBagsAutoEnabled);
  const eyeBagsAutoIntensity = useAvatarStore(
    state => state.eyeBagsAutoIntensity
  );
  const eyeBagsIntensity = useAvatarStore(state => state.eyeBagsIntensity);
  const eyeBagsOffsetX = useAvatarStore(state => state.eyeBagsOffsetX);
  const eyeBagsOffsetY = useAvatarStore(state => state.eyeBagsOffsetY);
  const eyeBagsOffsetZ = useAvatarStore(state => state.eyeBagsOffsetZ);
  const eyeBagsWidth = useAvatarStore(state => state.eyeBagsWidth);
  const eyeBagsHeight = useAvatarStore(state => state.eyeBagsHeight);
  const eyeBagsAspectX = useAvatarStore(state => state.eyeBagsAspectX);

  const stateRef = useRef<EyeBagsState | null>(null);

  const disposeEyeBags = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;

    const removeOverlay = ({ mesh, parent }: EyeBagsState['left']) => {
      if (parent && mesh.parent === parent) {
        parent.remove(mesh);
      }
      mesh.geometry.dispose();
      mesh.material.dispose();
    };

    removeOverlay(current.left);
    removeOverlay(current.right);
    stateRef.current = null;
  }, []);

  const effectiveIntensity = useMemo(() => {
    if (eyeBagsOverrideEnabled) return clamp01(eyeBagsIntensity);
    if (eyeBagsAutoEnabled) return clamp01(eyeBagsAutoIntensity);
    return 0;
  }, [
    eyeBagsAutoEnabled,
    eyeBagsAutoIntensity,
    eyeBagsIntensity,
    eyeBagsOverrideEnabled,
  ]);

  const applyParameters = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;

    const intensity = effectiveIntensity;
    const aspect = Math.max(0.1, eyeBagsAspectX);
    const visible = intensity > 0.01;

    const overlays: Array<{ mesh: EyeBagMesh; side: 'left' | 'right' }> = [
      { mesh: state.left.mesh, side: 'left' },
      { mesh: state.right.mesh, side: 'right' },
    ];

    overlays.forEach(({ mesh, side }) => {
      const material = mesh.material as EyeBagShaderMaterial | undefined;
      if (!material?.uniforms) {
        if (AVATAR_DEBUG) {
          console.warn('Eye-bag material missing uniforms, skipping update.');
        }
        return;
      }

      const uniforms = material.uniforms;
      uniforms.intensity.value = intensity;
      uniforms.aspect.value = aspect;
      uniforms.softness.value = 1.15 + eyeBagsWidth * 1.45;
      uniforms.verticalShift.value = 0.55 + eyeBagsHeight * 0.6;
      material.needsUpdate = true;

      mesh.visible = visible;
      if (!visible) return;

      const offsetX = side === 'left' ? eyeBagsOffsetX : -eyeBagsOffsetX;
      mesh.position.set(offsetX, eyeBagsOffsetY, eyeBagsOffsetZ);
      mesh.scale.set(eyeBagsWidth, eyeBagsHeight, 1);
    });
  }, [
    AVATAR_DEBUG,
    effectiveIntensity,
    eyeBagsAspectX,
    eyeBagsHeight,
    eyeBagsOffsetX,
    eyeBagsOffsetY,
    eyeBagsOffsetZ,
    eyeBagsWidth,
  ]);

  useEffect(() => {
    if (!headMesh || !headMesh.skeleton) {
      disposeEyeBags();
      return;
    }

    const skeleton = headMesh.skeleton;
    const headBone = findHeadBone(skeleton);
    const leftParent = findEyeBone(skeleton, 'left') || headBone;
    const rightParent = findEyeBone(skeleton, 'right') || headBone;

    if (!leftParent || !rightParent) {
      disposeEyeBags();
      if (AVATAR_DEBUG) {
        console.warn('Unable to locate eye bones for eye-bag placement.');
      }
      return;
    }

    disposeEyeBags();

    const leftMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      createEyeBagMaterial()
    ) as EyeBagMesh;
    leftMesh.name = 'AvatarEyeBagLeft';
    leftMesh.renderOrder = 9999;
    leftMesh.frustumCulled = false;
    leftMesh.rotation.y = Math.PI;
    leftMesh.userData.__isEyeBagOverlay = true;

    const rightMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      createEyeBagMaterial()
    ) as EyeBagMesh;
    rightMesh.name = 'AvatarEyeBagRight';
    rightMesh.renderOrder = 9999;
    rightMesh.frustumCulled = false;
    rightMesh.rotation.y = Math.PI;
    rightMesh.userData.__isEyeBagOverlay = true;

    leftParent.add(leftMesh);
    rightParent.add(rightMesh);

    stateRef.current = {
      left: { mesh: leftMesh, parent: leftParent },
      right: { mesh: rightMesh, parent: rightParent },
    };

    if (AVATAR_DEBUG) {
      console.log(
        'Eye-bags attached to parents:',
        leftParent.name,
        rightParent.name
      );
    }

    applyParameters();

    return () => {
      disposeEyeBags();
    };
  }, [headMesh, applyParameters, disposeEyeBags]);

  useEffect(() => {
    applyParameters();
  }, [applyParameters]);

  useEffect(() => {
    return () => {
      disposeEyeBags();
    };
  }, [disposeEyeBags]);

  return null;
}

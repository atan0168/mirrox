import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { GLBAnimationLoader } from '../../utils/GLBAnimationLoader';
import { assetPreloader } from '../../services/AssetPreloader';
import {
  IDLE_ANIMATIONS,
  AVATAR_DEBUG,
  ONE_SHOT_ANIMATION_KEYWORDS,
} from '../../constants';
import { buildBoneRemapper } from '../../utils/ThreeUtils';
import { EyeBags } from './EyeBags';

interface AvatarModelProps {
  url: string;
  activeAnimation: string | null;
  facialExpression?: string;
  skinToneAdjustment?: number; // -1 to 1, where negative darkens and positive lightens
  animationSpeedScale?: number; // 0.5..1.5 scale
  onLoadingChange?: (loading: boolean) => void;
  onLoadingProgress?: (progress: {
    loaded: number;
    total: number;
    item: string;
  }) => void;
  additionalIdleAnimations?: string[]; // Extra idle animations based on context (e.g., yawn when sleep-deprived)
  isActive?: boolean;
}

export function AvatarModel({
  url,
  activeAnimation,
  facialExpression = 'neutral',
  skinToneAdjustment = 0,
  animationSpeedScale = 1,
  onLoadingChange,
  onLoadingProgress,
  additionalIdleAnimations = [],
  isActive = true,
}: AvatarModelProps) {
  const { scene, animations } = useGLTF(url);
  const { camera } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [animationActionsMap, setAnimationActionsMap] = useState<
    Map<string, THREE.AnimationAction>
  >(new Map());
  const [glbAnimations, setGlbAnimations] = useState<THREE.AnimationClip[]>([]);
  const sceneRef = useRef<THREE.Group | null>(null);
  const [currentIdleIndex, setCurrentIdleIndex] = useState<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [headMesh, setHeadMesh] = useState<THREE.SkinnedMesh | null>(null);
  const [isLoadingAnimations, setIsLoadingAnimations] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    loaded: 0,
    total: 0,
    item: '',
  });
  // Track and restore camera state around sleeping
  const lastNonSleepCamPosRef = useRef<THREE.Vector3 | null>(null);
  const lastNonSleepCamLookAtRef = useRef<THREE.Vector3 | null>(null);
  const prevActiveAnimationRef = useRef<string | null>(null);
  const isActiveRef = useRef(isActive);

  // Update loading state
  useEffect(() => {
    const isLoading = isLoadingAnimations;
    onLoadingChange?.(isLoading);
  }, [isLoadingAnimations, onLoadingChange]);

  // Update loading progress
  useEffect(() => {
    onLoadingProgress?.(loadingProgress);
  }, [loadingProgress, onLoadingProgress]);

  // Define facial expression morph target mappings using ARKit blend shapes
  const FACIAL_EXPRESSIONS: { [key: string]: { [key: string]: number } } = {
    neutral: {
      // Reset all expressions to neutral
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      mouthFrownLeft: 0,
      mouthFrownRight: 0,
      jawOpen: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
    },
    happy: {
      mouthSmileLeft: 0.8,
      mouthSmileRight: 0.8,
      mouthDimpleLeft: 0.3,
      mouthDimpleRight: 0.3,
      cheekSquintLeft: 0.2,
      cheekSquintRight: 0.2,
      browInnerUp: 0.2,
    },
    tired: {
      // Heavier eyelids and downward gaze to read as sleepy
      eyeBlinkLeft: 0.6,
      eyeBlinkRight: 0.6,
      eyeSquintLeft: 0.2,
      eyeSquintRight: 0.2,
      eyeLookDownLeft: 0.25,
      eyeLookDownRight: 0.25,
      // Softer brows (avoid angry look) with slight droop
      browDownLeft: 0.25,
      browDownRight: 0.25,
      // Corners of mouth sag a bit
      mouthFrownLeft: 0.15,
      mouthFrownRight: 0.15,
      mouthShrugLower: 0.25,
      // Keep mouth mostly closed
      mouthClose: 0.3,
    },
    sleep: {
      eyeBlinkLeft: 1.0,
      eyeBlinkRight: 1.0,
      mouthClose: 0.2,
      jawOpen: 0.0,
    },
    exhausted: {
      // Very heavy lids with downward gaze
      eyeBlinkLeft: 0.85,
      eyeBlinkRight: 0.85,
      eyeSquintLeft: 0.15,
      eyeSquintRight: 0.15,
      eyeLookDownLeft: 0.35,
      eyeLookDownRight: 0.35,
      // Stronger mouth droop and slight opening
      mouthFrownLeft: 0.5,
      mouthFrownRight: 0.5,
      mouthShrugLower: 0.4,
      mouthOpen: 0.25,
      jawOpen: 0.15,
      // Brows droop but not too angry
      browDownLeft: 0.5,
      browDownRight: 0.5,
    },
    concerned: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      browInnerUp: 1.0,
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      eyeWideLeft: 0.3,
      eyeWideRight: 0.3,

      // mouth/jaw changes:
      jawOpen: 0.22,
      mouthClose: 0.15,
      mouthFrownLeft: 0.6,
      mouthFrownRight: 0.6,
      mouthRollUpper: 0.38,
      mouthRollLower: 0.34,
      mouthPucker: 0.12,

      // zero out these:
      mouthShrugUpper: 0.0,
      mouthShrugLower: 0.0,
      mouthStretchLeft: 0.0,
      mouthStretchRight: 0.0,
      mouthSmileLeft: 0.0,
      mouthSmileRight: 0.0,
    },
    calm: {
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      mouthSmileLeft: 0.1,
      mouthSmileRight: 0.1,
      browInnerUp: 0.1,
    },
    surprised: {
      eyeWideLeft: 0.8,
      eyeWideRight: 0.8,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      browInnerUp: 0.8,
      jawOpen: 0.4,
      mouthFunnel: 0.3,
    },
    angry: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      eyeSquintLeft: 0.7,
      eyeSquintRight: 0.7,
      mouthFrownLeft: 0.6,
      mouthFrownRight: 0.6,
      noseSneerLeft: 0.4,
      noseSneerRight: 0.4,
      mouthPressLeft: 0.3,
      mouthPressRight: 0.3,
    },
    upset: {
      // Visibly displeased but not angry; between concerned and angry
      browDownLeft: 0.55,
      browDownRight: 0.55,
      browInnerUp: 0.35,
      eyeSquintLeft: 0.35,
      eyeSquintRight: 0.35,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      jawOpen: 0.12,
      mouthFrownLeft: 0.55,
      mouthFrownRight: 0.55,
      mouthPressLeft: 0.15,
      mouthPressRight: 0.15,
      mouthClose: 0.2,
    },
    sick: {
      browInnerUp: 1.0,
      browDownLeft: 0.8,
      browDownRight: 0.8,
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      eyeBlinkLeft: 0.2,
      eyeBlinkRight: 0.2,
      eyeLookDownLeft: 0.2,
      eyeLookDownRight: 0.2,
      jawOpen: 0.12,
      mouthClose: 0.25,
      mouthFrownLeft: 0.6,
      mouthFrownRight: 0.6,
      mouthPressLeft: 0.4,
      mouthPressRight: 0.4,
      mouthRollUpper: 0.1,
      mouthRollLower: 0.1,
    },
    // Health-related expressions for digital twin
    coughing: {
      jawOpen: 0.8,
      mouthOpen: 0.7,
      mouthFrownLeft: 0.3,
      mouthFrownRight: 0.3,
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      browDownLeft: 0.2,
      browDownRight: 0.2,
    },
    breathing_difficulty: {
      jawOpen: 0.3,
      mouthOpen: 0.4,
      mouthFrownLeft: 0.4,
      mouthFrownRight: 0.4,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
      browDownLeft: 0.4,
      browDownRight: 0.4,
      noseSneerLeft: 0.2,
      noseSneerRight: 0.2,
    },
    // Test expression - will be dynamically populated with available morph targets
    test: {},
  };

  // Helper function to get available idle animations
  const getAvailableIdleAnimations = () => {
    const base = IDLE_ANIMATIONS;
    const extended = additionalIdleAnimations
      ? Array.from(new Set([...base, ...additionalIdleAnimations]))
      : base;
    return extended.filter(name => animationActionsMap.has(name));
  };

  // Helper function to get current idle animation
  const getCurrentIdleAnimation = () => {
    const availableIdles = getAvailableIdleAnimations();
    if (availableIdles.length === 0) return null;
    return availableIdles[currentIdleIndex % availableIdles.length];
  };

  // Function to cycle to next idle animation
  const cycleToNextIdleAnimation = () => {
    if (!isActiveRef.current) {
      return;
    }
    const availableIdles = getAvailableIdleAnimations();
    if (availableIdles.length > 1) {
      setCurrentIdleIndex(prev => (prev + 1) % availableIdles.length);
      if (AVATAR_DEBUG) {
        console.log(
          `Cycling to next idle animation. New index: ${(currentIdleIndex + 1) % availableIdles.length}`
        );
      }
    }
  };

  // Function to apply facial expression with smooth transitions
  const applyFacialExpression = (
    expression: string,
    transitionDuration: number = 0.5
  ) => {
    if (!headMesh || !headMesh.morphTargetInfluences) {
      if (AVATAR_DEBUG) {
        console.log('❌ No morph targets available for facial expressions');
        console.log('Head mesh:', headMesh ? 'found' : 'not found');
        console.log(
          'Morph target influences:',
          headMesh?.morphTargetInfluences ? 'found' : 'not found'
        );
      }
      return;
    }

    const morphTargetDictionary = headMesh.morphTargetDictionary;
    if (!morphTargetDictionary) {
      console.log('❌ No morph target dictionary found');
      return;
    }

    if (AVATAR_DEBUG) {
      console.log(`🎭 Applying facial expression: ${expression}`);
      console.log(
        `📊 Available morph targets (${Object.keys(morphTargetDictionary).length}):`,
        Object.keys(morphTargetDictionary)
      );
    }

    // Store current morph target values for smooth transition
    const currentValues = [...headMesh.morphTargetInfluences];

    // Get target expression data
    const expressionData = FACIAL_EXPRESSIONS[expression];
    if (!expressionData) {
      console.warn(`❌ Unknown facial expression: ${expression}`);
      console.log('Available expressions:', Object.keys(FACIAL_EXPRESSIONS));
      return;
    }

    if (AVATAR_DEBUG) {
      console.log(`🎯 Expression data for "${expression}":`, expressionData);
    }

    // Check which morph targets from the expression are actually available
    const availableMorphs: string[] = [];
    const missingMorphs: string[] = [];

    Object.keys(expressionData).forEach(morphTarget => {
      if (morphTargetDictionary[morphTarget] !== undefined) {
        availableMorphs.push(morphTarget);
      } else {
        missingMorphs.push(morphTarget);
      }
    });

    if (AVATAR_DEBUG) {
      console.log(
        `✅ Available morph targets for expression:`,
        availableMorphs
      );
      if (missingMorphs.length > 0) {
        console.log(`❌ Missing morph targets:`, missingMorphs);
      }
    }

    if (availableMorphs.length === 0) {
      console.warn(
        `❌ No compatible morph targets found for expression "${expression}"`
      );
      return;
    }

    // Create transition animation
    const startTime = Date.now();
    const duration = transitionDuration * 1000; // Convert to milliseconds

    // Optimized single-pass transition: compute target array once then lerp all indices
    const targetValues = new Array(headMesh.morphTargetInfluences.length).fill(
      0
    );
    let appliedMorphCount = 0;
    Object.entries(expressionData).forEach(([morphTarget, targetValue]) => {
      const idx = morphTargetDictionary[morphTarget];
      if (idx !== undefined) {
        targetValues[idx] = targetValue;
        appliedMorphCount++;
      }
    });

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      for (let i = 0; i < headMesh.morphTargetInfluences!.length; i++) {
        const currentValue = currentValues[i] || 0;
        const targetValue = targetValues[i];
        headMesh.morphTargetInfluences![i] =
          currentValue + (targetValue - currentValue) * easeProgress;
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else if (AVATAR_DEBUG) {
        console.log(
          `✅ Applied facial expression: ${expression} (${appliedMorphCount}/${Object.keys(expressionData).length} morph targets)`
        );
        console.log('🔍 Current morph target state:');
        Object.entries(morphTargetDictionary).forEach(([name, index]) => {
          const value = headMesh.morphTargetInfluences![index];
          if (value !== 0) {
            console.log(`  ${name}: ${value.toFixed(3)}`);
          }
        });
      }
    };

    // Start the transition animation
    animateTransition();
  };

  // Function to find head mesh with morph targets
  const findHeadMesh = (scene: THREE.Group) => {
    let foundHeadMesh: THREE.SkinnedMesh | null = null;
    let fallbackMesh: THREE.SkinnedMesh | null =
      null as THREE.SkinnedMesh | null;
    let maxMorphTargets = 0;
    const allMeshes: Array<{
      name: string;
      type: string;
      morphTargets: number;
      material?: string;
    }> = [];

    if (AVATAR_DEBUG)
      console.log('🔍 Single-pass search for head mesh + diagnostics');

    scene.traverse(child => {
      const isSkinned = child instanceof THREE.SkinnedMesh;
      const isMesh = child instanceof THREE.Mesh;
      if (!isSkinned && !isMesh) return;

      const morphCount = child.morphTargetInfluences?.length || 0;
      if (morphCount > 0) {
        const materialName = isSkinned
          ? (() => {
              const mat = (child as THREE.SkinnedMesh).material;
              if (Array.isArray(mat)) {
                return mat
                  .map((m: THREE.Material) => m.name || 'mat')
                  .join(', ');
              }
              return mat?.name || 'unknown';
            })()
          : (child as THREE.Mesh).material &&
              !Array.isArray((child as THREE.Mesh).material)
            ? ((child as THREE.Mesh).material as THREE.Material).name
            : 'unknown';

        allMeshes.push({
          name: child.name,
          type: isSkinned ? 'SkinnedMesh' : 'Mesh',
          morphTargets: morphCount,
          material: materialName,
        });

        if (AVATAR_DEBUG) {
          console.log(
            `📦 ${isSkinned ? 'SkinnedMesh' : 'Mesh'}: "${child.name}" | Morph Targets: ${morphCount}`
          );
        }

        if (isSkinned && morphCount > maxMorphTargets) {
          fallbackMesh = child as THREE.SkinnedMesh;
          maxMorphTargets = morphCount;
        }

        if (!foundHeadMesh && isSkinned) {
          const nameLower = child.name.toLowerCase();
          let matNameLower = '';
          const matRef = (child as THREE.SkinnedMesh).material as
            | THREE.Material
            | THREE.Material[]
            | undefined;
          if (Array.isArray(matRef)) {
            if (matRef[0]) matNameLower = matRef[0].name.toLowerCase();
          } else if (matRef) {
            matNameLower = matRef.name.toLowerCase();
          }
          if (
            nameLower.includes('head') ||
            nameLower.includes('face') ||
            nameLower.includes('wolf3d_head') ||
            matNameLower.includes('head')
          ) {
            foundHeadMesh = child as THREE.SkinnedMesh;
          }
        }
      }
    });

    if (!foundHeadMesh && fallbackMesh) {
      foundHeadMesh = fallbackMesh;
      if (AVATAR_DEBUG)
        console.log(
          `🎯 Using fallback mesh with most morph targets: ${(fallbackMesh && fallbackMesh.name) || 'unknown'}`
        );
    }

    if (AVATAR_DEBUG) {
      console.log(`📊 Total meshes traversed: ${allMeshes.length}`);
      const withMorphs = allMeshes.filter(m => m.morphTargets > 0).length;
      console.log(`📊 Meshes with morph targets: ${withMorphs}`);
    }

    if (foundHeadMesh && foundHeadMesh.morphTargetDictionary) {
      const availableMorphs = Object.keys(foundHeadMesh.morphTargetDictionary);
      console.log('📋 Available morph targets:', availableMorphs);

      // Precompute set for O(1) lookups
      const morphSet = new Set(availableMorphs);

      // ARKit reference list
      const arkitMorphs = [
        'eyeBlinkLeft',
        'eyeLookDownLeft',
        'eyeLookInLeft',
        'eyeLookOutLeft',
        'eyeLookUpLeft',
        'eyeSquintLeft',
        'eyeWideLeft',
        'eyeBlinkRight',
        'eyeLookDownRight',
        'eyeLookInRight',
        'eyeLookOutRight',
        'eyeLookUpRight',
        'eyeSquintRight',
        'eyeWideRight',
        'jawForward',
        'jawLeft',
        'jawRight',
        'jawOpen',
        'mouthClose',
        'mouthFunnel',
        'mouthPucker',
        'mouthLeft',
        'mouthRight',
        'mouthSmileLeft',
        'mouthSmileRight',
        'mouthFrownLeft',
        'mouthFrownRight',
        'mouthDimpleLeft',
        'mouthDimpleRight',
        'mouthStretchLeft',
        'mouthStretchRight',
        'mouthRollLower',
        'mouthRollUpper',
        'mouthShrugLower',
        'mouthShrugUpper',
        'mouthPressLeft',
        'mouthPressRight',
        'mouthLowerDownLeft',
        'mouthLowerDownRight',
        'mouthUpperUpLeft',
        'mouthUpperUpRight',
        'browDownLeft',
        'browDownRight',
        'browInnerUp',
        'browOuterUpLeft',
        'browOuterUpRight',
        'cheekPuff',
        'cheekSquintLeft',
        'cheekSquintRight',
        'noseSneerLeft',
        'noseSneerRight',
        'tongueOut',
      ];

      const presentARKitMorphs: string[] = [];
      const missingARKitMorphs: string[] = [];
      for (const m of arkitMorphs)
        (morphSet.has(m) ? presentARKitMorphs : missingARKitMorphs).push(m);
      const extraMorphs = availableMorphs.filter(m => !arkitMorphs.includes(m));

      console.log(
        `🎯 ARKit morph targets present (${presentARKitMorphs.length}/52)`
      );
      console.log(
        `❌ ARKit morph targets missing (${missingARKitMorphs.length}/52)`
      );
      if (extraMorphs.length)
        console.log(
          `➕ Additional (non-ARKit) morph targets (${extraMorphs.length})`
        );

      // Build / adjust dynamic expressions with single pass categorization
      const dynamicExpressions: { [key: string]: { [key: string]: number } } = {
        happy: {},
        sad: {},
        surprised: {},
        coughing: {},
      };
      for (const m of morphSet) {
        if (m === 'mouthSmileLeft')
          dynamicExpressions.happy.mouthSmileLeft = 0.8;
        else if (m === 'mouthSmileRight')
          dynamicExpressions.happy.mouthSmileRight = 0.8;
        else if (m === 'mouthSmile') dynamicExpressions.happy.mouthSmile = 0.7;
        else if (m === 'jawOpen') {
          dynamicExpressions.happy.jawOpen = 0.1;
          dynamicExpressions.surprised.jawOpen = 0.7;
          dynamicExpressions.coughing.jawOpen = 0.5;
        } else if (m === 'cheekSquintLeft')
          dynamicExpressions.happy.cheekSquintLeft = 0.3;
        else if (m === 'cheekSquintRight')
          dynamicExpressions.happy.cheekSquintRight = 0.3;
        else if (m === 'mouthFrownLeft') {
          dynamicExpressions.sad.mouthFrownLeft = 0.7;
        } else if (m === 'mouthFrownRight') {
          dynamicExpressions.sad.mouthFrownRight = 0.7;
        } else if (m === 'browDownLeft') {
          dynamicExpressions.sad.browDownLeft = 0.5;
          dynamicExpressions.coughing.browDownLeft = 0.3;
        } else if (m === 'browDownRight') {
          dynamicExpressions.sad.browDownRight = 0.5;
          dynamicExpressions.coughing.browDownRight = 0.3;
        } else if (m === 'mouthLowerDownLeft')
          dynamicExpressions.sad.mouthLowerDownLeft = 0.3;
        else if (m === 'mouthLowerDownRight')
          dynamicExpressions.sad.mouthLowerDownRight = 0.3;
        else if (m === 'eyeWideLeft')
          dynamicExpressions.surprised.eyeWideLeft = 0.9;
        else if (m === 'eyeWideRight')
          dynamicExpressions.surprised.eyeWideRight = 0.9;
        else if (m === 'mouthFunnel')
          dynamicExpressions.surprised.mouthFunnel = 0.4;
        else if (m === 'browInnerUp')
          dynamicExpressions.surprised.browInnerUp = 0.6;
        else if (m === 'browOuterUpLeft')
          dynamicExpressions.surprised.browOuterUpLeft = 0.5;
        else if (m === 'browOuterUpRight')
          dynamicExpressions.surprised.browOuterUpRight = 0.5;
        else if (m === 'mouthOpen') {
          dynamicExpressions.coughing.mouthOpen = 0.6;
          if (!dynamicExpressions.surprised.jawOpen)
            dynamicExpressions.surprised.mouthOpen = 0.6;
        } else if (m === 'eyeSquintLeft')
          dynamicExpressions.coughing.eyeSquintLeft = 0.4;
        else if (m === 'eyeSquintRight')
          dynamicExpressions.coughing.eyeSquintRight = 0.4;
        else if (m === 'mouthSmile') {
          if (
            !dynamicExpressions.sad.mouthFrownLeft &&
            !dynamicExpressions.sad.mouthFrownRight
          )
            dynamicExpressions.sad.mouthSmile = -0.3;
        }
      }

      // Apply generated expressions if non-empty
      for (const key of Object.keys(dynamicExpressions)) {
        if (Object.keys(dynamicExpressions[key]).length > 0) {
          FACIAL_EXPRESSIONS[key] = dynamicExpressions[key];
          console.log(`✅ Updated ${key} expression:`, dynamicExpressions[key]);
        }
      }

      // Test expression
      if (availableMorphs.length)
        FACIAL_EXPRESSIONS.test = { [availableMorphs[0]]: 0.8 };

      // Coverage stats
      const allExpressionMorphs = new Set<string>();
      Object.values(FACIAL_EXPRESSIONS).forEach(expr =>
        Object.keys(expr).forEach(m => allExpressionMorphs.add(m))
      );
      let presentCount = 0;
      for (const m of allExpressionMorphs) if (morphSet.has(m)) presentCount++;
      console.log(
        `📊 Expression system compatibility: ${Math.round((presentCount / allExpressionMorphs.size) * 100)}%`
      );

      // Simple pattern grouping single pass
      const patterns = {
        mouth: [] as string[],
        eye: [] as string[],
        brow: [] as string[],
        jaw: [] as string[],
        smile: [] as string[],
        frown: [] as string[],
      };
      for (const m of morphSet) {
        const low = m.toLowerCase();
        if (low.includes('mouth')) patterns.mouth.push(m);
        if (low.includes('eye')) patterns.eye.push(m);
        if (low.includes('brow')) patterns.brow.push(m);
        if (low.includes('jaw')) patterns.jaw.push(m);
        if (low.includes('smile')) patterns.smile.push(m);
        if (low.includes('frown')) patterns.frown.push(m);
      }
      console.log('🔍 Morph target patterns found:', patterns);
    }

    if (!foundHeadMesh) {
      console.error('❌ No mesh with morph targets found');
    }

    return foundHeadMesh;
  };

  // Adjust camera position based on active animation
  useEffect(() => {
    const targetPosition = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    const wasSleeping =
      prevActiveAnimationRef.current === 'sleeping' ||
      prevActiveAnimationRef.current === 'sleeping_idle';
    const isSleeping =
      activeAnimation === 'sleeping' || activeAnimation === 'sleeping_idle';

    // If leaving sleeping, restore the last non-sleep camera state
    if (wasSleeping && !isSleeping) {
      const restorePos =
        lastNonSleepCamPosRef.current || camera.position.clone();
      const restoreLook =
        lastNonSleepCamLookAtRef.current || new THREE.Vector3(0, 0, 0);
      targetPosition.copy(restorePos);
      targetLookAt.copy(restoreLook);
    } else if (isSleeping) {
      // Sleeping cinematic
      targetPosition.set(0.5, 4.8, 4.8);
      targetLookAt.set(0, -1.2, -2.0);
    } else if (activeAnimation === 'mixamo.com') {
      // A different angle for demo animation
      targetPosition.set(-3, 1.2, 4);
      targetLookAt.set(0, 0, 0);
    } else {
      // Default idle framing (classic)
      targetPosition.set(0, 0.5, 5);
      targetLookAt.set(0, 0, 0);
    }

    let rafId: number | null = null;
    let cancelled = false;

    // Smooth camera transition with cancellation between animation toggles
    const animate = () => {
      if (cancelled) return;
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(targetLookAt);

      if (camera.position.distanceTo(targetPosition) > 0.01) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    // For any non-sleeping state, remember target for future restore
    if (!isSleeping) {
      lastNonSleepCamPosRef.current = targetPosition.clone();
      lastNonSleepCamLookAtRef.current = targetLookAt.clone();
    }

    // Remember previous animation for next run
    prevActiveAnimationRef.current = activeAnimation;

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [activeAnimation, camera]);

  // Find head mesh and apply facial expressions
  useEffect(() => {
    if (scene) {
      const foundHeadMesh = findHeadMesh(scene);
      setHeadMesh(foundHeadMesh);
    }
  }, [scene]);

  // Apply facial expression when it changes
  useEffect(() => {
    if (headMesh && facialExpression) {
      applyFacialExpression(facialExpression);
    }
  }, [headMesh, facialExpression]);

  // Configure materials for mobile compatibility and apply skin tone adjustments
  // Important: apply skin tone relative to original base color to avoid cumulative darkening across re-renders
  useEffect(() => {
    if (!scene) return;

    console.log(
      'Scene loaded. Configuring materials for mobile compatibility.'
    );

    const compatibleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1,
    });

    scene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;

      if (child.userData?.__isEyeBagOverlay) {
        return;
      }

      // Ensure MeshStandardMaterial for proper PBR shading on mobile
      if (
        child.material &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.material.envMapIntensity = 0.5;
        child.material.needsUpdate = true;
      } else {
        child.material = compatibleMaterial;
      }

      // Shadows (skip on Android for perf/artefacts)
      if (Platform.OS !== 'android') {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      // Identify likely skin meshes by name/material name
      const isSkinMesh = (() => {
        const n = child.name?.toLowerCase?.() || '';
        const mn = child.material?.name?.toLowerCase?.() || '';
        return (
          n.includes('body') ||
          n.includes('head') ||
          n.includes('face') ||
          n.includes('arm') ||
          n.includes('leg') ||
          mn.includes('skin') ||
          mn.includes('body')
        );
      })();

      if (!isSkinMesh) return;

      const stdMat = child.material as THREE.MeshStandardMaterial;

      // Cache the original base color and ensure we only clone the material once
      if (!child.userData.__baseSkinColor) {
        // Clone the material so skin adjustments are per-mesh and not shared
        child.material = stdMat.clone();
        child.userData.__baseSkinColor = (
          child.material as THREE.MeshStandardMaterial
        ).color.clone();
      }

      const baseColor: THREE.Color = child.userData.__baseSkinColor;

      // Compute adjusted color from original base color (not from last adjusted value)
      const adjusted = baseColor.clone();
      if (skinToneAdjustment > 0) {
        adjusted.lerp(new THREE.Color(1, 1, 1), skinToneAdjustment);
      } else if (skinToneAdjustment < 0) {
        adjusted.lerp(
          new THREE.Color(0.2, 0.15, 0.1),
          Math.abs(skinToneAdjustment)
        );
      }

      (child.material as THREE.MeshStandardMaterial).color.copy(adjusted);
      (child.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });

    sceneRef.current = scene;
    console.log('Model materials configured for mobile.');
  }, [scene, skinToneAdjustment]);

  // Load GLB animations from preloaded assets
  useEffect(() => {
    if (!scene) return;

    console.log('Loading GLB animations from preloaded assets...');
    const loadGLBAnimations = async () => {
      setIsLoadingAnimations(true);

      try {
        // Get preloaded animations
        const preloadedAnimations = assetPreloader.getAllPreloadedAnimations();

        if (Object.keys(preloadedAnimations).length > 0) {
          console.log('✅ Using preloaded animations');

          const successfulAnimations: THREE.AnimationClip[] = [];
          Object.entries(preloadedAnimations).forEach(([name, animations]) => {
            if (animations && Array.isArray(animations)) {
              console.log(
                `✅ Found preloaded animation: ${name} (${animations.length} clips)`
              );
              successfulAnimations.push(...animations);
            }
          });

          if (successfulAnimations.length > 0) {
            console.log(
              `🎬 Using ${successfulAnimations.length} preloaded animation clips`
            );
            setGlbAnimations(successfulAnimations);
            setLoadingProgress({
              loaded: Object.keys(preloadedAnimations).length,
              total: Object.keys(preloadedAnimations).length,
              item: 'Preloaded animations ready!',
            });
          } else {
            console.log(
              '❌ No valid preloaded animations found, loading fallback'
            );
            await loadAnimationsFallback();
          }
        } else {
          console.log('❌ No preloaded animations found, loading fallback');
          await loadAnimationsFallback();
        }
      } catch (error) {
        console.error('❌ Error loading preloaded animations:', error);
        await loadAnimationsFallback();
      } finally {
        setIsLoadingAnimations(false);
      }
    };

    // Fallback animation loading (same as original logic)
    const loadAnimationsFallback = async () => {
      console.log('Loading animations as fallback...');
      const glbLoader = new GLBAnimationLoader();

      const animationAssets = [
        {
          asset: require('../../../assets/animations/M_Standing_Expressions_007.glb'),
          name: 'M_Standing_Expressions_007',
        },
        {
          asset: require('../../../assets/animations/M_Standing_Idle_Variations_003.glb'),
          name: 'M_Standing_Idle_Variations_003',
        },
        {
          asset: require('../../../assets/animations/M_Standing_Idle_Variations_007.glb'),
          name: 'M_Standing_Idle_Variations_007',
        },
        {
          asset: require('../../../assets/animations/wiping_sweat.glb'),
          name: 'wiping_sweat',
        },
        {
          asset: require('../../../assets/animations/shock.glb'),
          name: 'shock',
        },
        {
          asset: require('../../../assets/animations/swat_bugs.glb'),
          name: 'swat_bugs',
        },
        {
          asset: require('../../../assets/animations/drinking.glb'),
          name: 'drinking',
        },
        {
          asset: require('../../../assets/animations/yawn.glb'),
          name: 'yawn',
        },
        {
          asset: require('../../../assets/animations/sleeping.glb'),
          name: 'sleeping',
        },
        {
          asset: require('../../../assets/animations/sleeping_idle.glb'),
          name: 'sleeping_idle',
        },
        {
          asset: require('../../../assets/animations/slump.glb'),
          name: 'slump',
        },
      ];

      const animationPromises = animationAssets.map(async ({ asset, name }) => {
        try {
          return await glbLoader.loadGLBAnimationFromAsset(asset);
        } catch (error) {
          console.warn(`Failed to load fallback animation ${name}:`, error);
          return null;
        }
      });

      const loadedAnimations = await Promise.all(animationPromises);
      const successfulAnimations: THREE.AnimationClip[] = [];

      loadedAnimations.forEach(result => {
        if (result) {
          successfulAnimations.push(...result);
        }
      });

      if (successfulAnimations.length > 0) {
        console.log(
          `🎬 Loaded ${successfulAnimations.length} fallback animation clips`
        );
        setGlbAnimations(successfulAnimations);
      }

      setLoadingProgress({
        loaded: animationAssets.length,
        total: animationAssets.length,
        item: 'Fallback animations ready!',
      });
    };

    loadGLBAnimations();
  }, [scene]);

  // Set up animations
  useEffect(() => {
    if (!scene) return;

    console.log('Setting up animation mixer...');

    // Clean up existing mixer
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    const actionsMap = new Map<string, THREE.AnimationAction>();

    // Priority 1: Use GLB animations if available
    if (glbAnimations.length > 0) {
      console.log(`Setting up ${glbAnimations.length} GLB animations...`);

      let avatarSkeleton: THREE.Skeleton | null = null;
      let avatarSkinnedMesh: THREE.SkinnedMesh | null = null;
      scene.traverse(child => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          avatarSkeleton = child.skeleton;
          avatarSkinnedMesh = child;
          console.log(
            'Found avatar skeleton with',
            child.skeleton.bones.length,
            'bones'
          );
        }
      });

      if (avatarSkeleton && avatarSkinnedMesh) {
        const skeleton = avatarSkeleton as THREE.Skeleton;
        const remapper = buildBoneRemapper(skeleton);

        for (const [index, clip] of glbAnimations.entries()) {
          try {
            console.log(`Setting up GLB animation ${index}: ${clip.name}`);

            const clipNameLower = clip.name.toLowerCase();
            const keptTracks: THREE.KeyframeTrack[] = [];

            for (const track of clip.tracks) {
              // fast reject: must be "bone.property"
              const dot = track.name.indexOf('.');
              if (dot <= 0) continue;

              const boneName = track.name.slice(0, dot);
              const property = track.name.slice(dot + 1);

              // 1) drop position/scale early
              if (remapper.propDeny.has(property)) continue;

              // 2) drop toes early
              if (remapper.toeRegex.test(boneName)) continue;

              // 3) find/resolve bone and remap once
              const matched = remapper.remap(boneName);
              if (!matched) continue;

              if (matched.name !== boneName) {
                track.name = `${matched.name}.${property}`;
                if (AVATAR_DEBUG)
                  console.log(`Remapped bone: ${boneName} -> ${matched.name}`);
              }

              keptTracks.push(track);
            }

            if (keptTracks.length === 0) {
              console.warn(
                `No valid tracks after single-pass filter: ${clip.name}`
              );
              continue;
            }

            const filteredClip = new THREE.AnimationClip(
              `${clip.name}_filtered`,
              clip.duration,
              keptTracks
            );
            const action = mixer.clipAction(filteredClip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = true;
            action.setEffectiveWeight(1.0);

            if (
              clipNameLower.includes('mixamo') ||
              clipNameLower.includes('cough')
            ) {
              action.setEffectiveTimeScale(1.0);
            }

            actionsMap.set(clip.name, action);
          } catch (error) {
            console.error(`Error setting up GLB animation ${index}:`, error);
          }
        }

        if (actionsMap.size > 0) {
          console.log(
            `Successfully set up ${actionsMap.size} filtered FBX animations`
          );
          console.log('Available animations:', Array.from(actionsMap.keys()));
          setAnimationActionsMap(actionsMap);
          return;
        }
      } else {
        console.warn(
          'No skeleton found in avatar, cannot apply FBX animations'
        );
      }
    }

    // Priority 2: Use GLB animations if available
    if (animations && animations.length > 0) {
      console.log(`Setting up ${animations.length} GLB animations...`);

      animations.forEach((clip: THREE.AnimationClip, index: number) => {
        try {
          console.log(`Loading GLB animation ${index}: ${clip.name}`);
          const action = mixer.clipAction(clip);
          const clipNameLower = clip.name.toLowerCase();
          const isOneShot = ONE_SHOT_ANIMATION_KEYWORDS.some(keyword =>
            clipNameLower.includes(keyword)
          );
          if (isOneShot) {
            action.setLoop(THREE.LoopOnce, 0);
            action.clampWhenFinished = true;
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
          }
          actionsMap.set(clip.name, action);
        } catch (error) {
          console.error(`Error setting up GLB animation ${index}:`, error);
        }
      });

      if (actionsMap.size > 0) {
        console.log(`Successfully set up ${actionsMap.size} GLB animations`);
        setAnimationActionsMap(actionsMap);
        return;
      }
    }

    // Priority 3: Create fallback animation
    console.log(
      'No FBX or GLB animations found, creating simple idle animation...'
    );

    try {
      let targetObject: THREE.Object3D = scene;
      let foundSkinned = false;

      scene.traverse(child => {
        if (!foundSkinned && child instanceof THREE.SkinnedMesh) {
          targetObject = child;
          foundSkinned = true;
          console.log('Found SkinnedMesh for animation:', child.name);
        } else if (
          !foundSkinned &&
          (child.name.toLowerCase().includes('avatar') ||
            child.name.toLowerCase().includes('armature') ||
            child.name.toLowerCase().includes('skeleton'))
        ) {
          targetObject = child;
          console.log('Found potential animation target:', child.name);
        }
      });

      console.log(
        'Creating fallback animation for:',
        targetObject.name || 'scene'
      );

      const times = [0, 1, 2];
      const scaleValues = [1, 1.01, 1];

      const scaleKF = new THREE.VectorKeyframeTrack(
        targetObject.uuid + '.scale',
        times,
        scaleValues.flatMap(val => [val, val, val])
      );

      const clip = new THREE.AnimationClip('idle_breathing', 2, [scaleKF]);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);

      actionsMap.set('idle_breathing', action);
      setAnimationActionsMap(actionsMap);
      console.log('Created fallback idle animation');
    } catch (error) {
      console.error('Error creating fallback animation:', error);
      setAnimationActionsMap(new Map());
    }
  }, [scene, animations, glbAnimations]);

  // Control animation playback
  useEffect(() => {
    isActiveRef.current = isActive;

    console.log(
      `Animation state changed: activeAnimation=${activeAnimation}, available actions: ${animationActionsMap.size}`
    );

    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (!isActive) {
      animationActionsMap.forEach(
        (action: THREE.AnimationAction, name: string) => {
          if (action.isRunning()) {
            console.log(`Stopping animation due to inactivity: ${name}`);
            action.stop();
          }
        }
      );
      return;
    }

    if (animationActionsMap.size > 0) {
      // Stop all currently running animations
      animationActionsMap.forEach(
        (action: THREE.AnimationAction, name: string) => {
          if (action.isRunning()) {
            console.log(`Stopping animation: ${name}`);
            action.stop();
          }
        }
      );

      // Determine which animation to play
      let animationToPlay = activeAnimation;

      // If no specific animation is requested, use idle cycling system
      if (!animationToPlay) {
        animationToPlay = getCurrentIdleAnimation();
        if (animationToPlay) {
          console.log(`Using idle animation: ${animationToPlay}`);

          // Set up cycling timer for idle animations (change every 10-15 seconds)
          const availableIdles = getAvailableIdleAnimations();
          if (availableIdles.length > 1) {
            idleTimerRef.current = setInterval(() => {
              if (!isActiveRef.current) {
                return;
              }
              cycleToNextIdleAnimation();
            }, 12000); // 12 seconds between idle animation changes
            console.log(
              `Started idle animation cycling timer for ${availableIdles.length} animations`
            );
          }
        }
      }

      // Reset avatar to safe state when stopping animations
      if (!animationToPlay && scene) {
        scene.traverse(child => {
          if (child instanceof THREE.SkinnedMesh) {
            child.visible = true;
            child.scale.set(1, 1, 1);
            child.position.x = 0;
            child.position.z = 0;
            console.log('Reset avatar to safe state after stopping animations');
          }
        });
      }

      // Start the requested or default animation
      if (animationToPlay && animationActionsMap.has(animationToPlay)) {
        const action = animationActionsMap.get(animationToPlay)!;
        try {
          console.log(`Starting animation: ${animationToPlay}`);

          const originalTransforms = new Map();
          if (scene) {
            scene.traverse(child => {
              if (child instanceof THREE.SkinnedMesh) {
                originalTransforms.set(child.uuid, {
                  position: child.position.clone(),
                  scale: child.scale.clone(),
                  visible: child.visible,
                });
              }
            });
          }

          action.reset();
          action.setEffectiveWeight(1);
          action.setEffectiveTimeScale(animationSpeedScale);
          action.play();

          // Ensure avatar stays visible and in position
          if (scene) {
            scene.traverse(child => {
              if (child instanceof THREE.SkinnedMesh) {
                const original = originalTransforms.get(child.uuid);
                if (original) {
                  child.position.copy(original.position);
                  child.scale.copy(original.scale);
                  child.visible = true;
                }
              }
            });
          }

          console.log(`Animation duration: ${action.getClip().duration}s`);
          console.log(`Animation tracks: ${action.getClip().tracks.length}`);
        } catch (error) {
          console.error(`Error starting animation ${animationToPlay}:`, error);
        }
      } else if (animationToPlay) {
        console.warn(`Animation not found: ${animationToPlay}`);
      } else {
        console.log('No animation requested, all animations stopped');
      }
    } else {
      console.log('No animation actions available');
    }
  }, [activeAnimation, animationActionsMap, scene, animationSpeedScale]);

  // Handle idle animation cycling
  useEffect(() => {
    // Only cycle if we're in idle mode (no active animation specified)
    if (!activeAnimation && animationActionsMap.size > 0) {
      if (!isActive) {
        animationActionsMap.forEach(action => {
          if (action.isRunning()) {
            action.stop();
          }
        });
        return;
      }

      const newIdleAnimation = getCurrentIdleAnimation();
      if (newIdleAnimation && animationActionsMap.has(newIdleAnimation)) {
        // Stop current animations
        animationActionsMap.forEach(action => {
          if (action.isRunning()) {
            action.stop();
          }
        });

        // Start new idle animation
        const action = animationActionsMap.get(newIdleAnimation)!;
        try {
          console.log(`Switching to idle animation: ${newIdleAnimation}`);
          action.reset();
          action.setEffectiveWeight(1);
          action.setEffectiveTimeScale(1);
          action.play();
        } catch (error) {
          console.error(
            `Error switching to idle animation ${newIdleAnimation}:`,
            error
          );
        }
      }
    } else if (!isActive) {
      animationActionsMap.forEach(action => {
        if (action.isRunning()) {
          action.stop();
        }
      });
    }
  }, [
    currentIdleIndex,
    activeAnimation,
    animationActionsMap,
    animationSpeedScale,
    isActive,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, []);

  // Update animation mixer each frame
  useFrame((_state, delta) => {
    if (mixerRef.current) {
      try {
        mixerRef.current.update(delta);

        // Continuously check and fix avatar visibility during animations
        if (scene) {
          scene.traverse(child => {
            if (child instanceof THREE.SkinnedMesh) {
              if (!child.visible) {
                console.warn(
                  'Avatar became invisible during animation, fixing...'
                );
                child.visible = true;
              }

              if (
                child.scale.x < 0.01 ||
                child.scale.y < 0.01 ||
                child.scale.z < 0.01
              ) {
                console.warn(
                  'Avatar became too small during animation, fixing...'
                );
                child.scale.set(1, 1, 1);
              }

              if (
                Math.abs(child.position.x) > 10 ||
                Math.abs(child.position.z) > 10
              ) {
                console.warn(
                  'Avatar moved too far during animation, fixing...'
                );
                child.position.x = 0;
                child.position.z = 0;
              }

              if (activeAnimation === 'mixamo.com') {
                if (child.position.y > -0.2) {
                  child.position.y = -0.2;
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Animation mixer update error:', error);
      }
    }
  });

  return (
    <group
      position={
        activeAnimation === 'sleeping' || activeAnimation === 'sleeping_idle'
          ? [0, 0, 1.0]
          : [0, 0, 0]
      }
    >
      <EyeBags headMesh={headMesh} />
      <primitive object={scene} />
    </group>
  );
}

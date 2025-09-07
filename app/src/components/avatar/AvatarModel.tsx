import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { GLBAnimationLoader } from '../../utils/GLBAnimationLoader';
import { assetPreloader } from '../../services/AssetPreloader';
import { IDLE_ANIMATIONS } from '../../constants';

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
      eyeSquintLeft: 0.6,
      eyeSquintRight: 0.6,
      eyeBlinkLeft: 0.3,
      eyeBlinkRight: 0.3,
      mouthFrownLeft: 0.2,
      mouthFrownRight: 0.2,
      browDownLeft: 0.4,
      browDownRight: 0.4,
    },
    sleep: {
      eyeBlinkLeft: 1.0,
      eyeBlinkRight: 1.0,
      mouthClose: 0.2,
      jawOpen: 0.0,
    },
    exhausted: {
      eyeBlinkLeft: 0.7,
      eyeBlinkRight: 0.7,
      mouthOpen: 0.2,
      mouthFrownLeft: 0.4,
      mouthFrownRight: 0.4,
      browDownLeft: 0.6,
      browDownRight: 0.6,
      jawOpen: 0.1,
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
    const availableIdles = getAvailableIdleAnimations();
    if (availableIdles.length > 1) {
      setCurrentIdleIndex(prev => (prev + 1) % availableIdles.length);
      console.log(
        `Cycling to next idle animation. New index: ${(currentIdleIndex + 1) % availableIdles.length}`
      );
    }
  };

  // Function to apply facial expression with smooth transitions
  const applyFacialExpression = (
    expression: string,
    transitionDuration: number = 0.5
  ) => {
    if (!headMesh || !headMesh.morphTargetInfluences) {
      console.log('❌ No morph targets available for facial expressions');
      console.log('Head mesh:', headMesh ? 'found' : 'not found');
      console.log(
        'Morph target influences:',
        headMesh?.morphTargetInfluences ? 'found' : 'not found'
      );
      return;
    }

    const morphTargetDictionary = headMesh.morphTargetDictionary;
    if (!morphTargetDictionary) {
      console.log('❌ No morph target dictionary found');
      return;
    }

    console.log(`🎭 Applying facial expression: ${expression}`);
    console.log(
      `📊 Available morph targets (${Object.keys(morphTargetDictionary).length}):`,
      Object.keys(morphTargetDictionary)
    );

    // Store current morph target values for smooth transition
    const currentValues = [...headMesh.morphTargetInfluences];

    // Get target expression data
    const expressionData = FACIAL_EXPRESSIONS[expression];
    if (!expressionData) {
      console.warn(`❌ Unknown facial expression: ${expression}`);
      console.log('Available expressions:', Object.keys(FACIAL_EXPRESSIONS));
      return;
    }

    console.log(`🎯 Expression data for "${expression}":`, expressionData);

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

    console.log(`✅ Available morph targets for expression:`, availableMorphs);
    if (missingMorphs.length > 0) {
      console.log(`❌ Missing morph targets:`, missingMorphs);
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

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easeInOutCubic for smooth transition
      const easeProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Reset all morph targets and interpolate to new values
      for (let i = 0; i < headMesh.morphTargetInfluences!.length; i++) {
        const currentValue = currentValues[i] || 0;
        headMesh.morphTargetInfluences![i] = currentValue * (1 - easeProgress);
      }

      // Apply the selected expression with interpolation
      let appliedCount = 0;
      Object.entries(expressionData).forEach(([morphTarget, targetValue]) => {
        const index = morphTargetDictionary[morphTarget];
        if (index !== undefined && headMesh.morphTargetInfluences) {
          const currentValue = currentValues[index] || 0;
          const interpolatedValue =
            currentValue + (targetValue - currentValue) * easeProgress;
          headMesh.morphTargetInfluences[index] = interpolatedValue;
          appliedCount++;

          if (progress === 1) {
            console.log(
              `🔧 Applied ${morphTarget}: ${interpolatedValue.toFixed(3)} (target: ${targetValue})`
            );
          }
        }
      });

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        console.log(
          `✅ Applied facial expression: ${expression} (${appliedCount}/${Object.keys(expressionData).length} morph targets)`
        );

        // Log current state of all morph targets for debugging
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

    console.log('🔍 Searching for head mesh with morph targets...');

    // First, let's log ALL meshes in the scene for debugging
    const allMeshes: Array<{
      name: string;
      type: string;
      morphTargets: number;
      material?: string;
    }> = [];

    scene.traverse(child => {
      if (child instanceof THREE.SkinnedMesh) {
        const morphTargetCount = child.morphTargetInfluences?.length || 0;
        const materialName =
          child.material?.name ||
          (Array.isArray(child.material)
            ? child.material.map(m => m.name).join(', ')
            : 'unknown');

        allMeshes.push({
          name: child.name,
          type: 'SkinnedMesh',
          morphTargets: morphTargetCount,
          material: materialName,
        });

        console.log(
          `📦 SkinnedMesh: "${child.name}" | Material: "${materialName}" | Morph Targets: ${morphTargetCount}`
        );

        if (morphTargetCount > 0) {
          console.log(
            `  🎯 Morph target dictionary:`,
            Object.keys(child.morphTargetDictionary || {})
          );
        }
      } else if (child instanceof THREE.Mesh) {
        const morphTargetCount = child.morphTargetInfluences?.length || 0;
        if (morphTargetCount > 0) {
          allMeshes.push({
            name: child.name,
            type: 'Mesh',
            morphTargets: morphTargetCount,
            material: child.material?.name || 'unknown',
          });
          console.log(
            `📦 Mesh: "${child.name}" | Material: "${child.material?.name}" | Morph Targets: ${morphTargetCount}`
          );
        }
      }
    });

    console.log(`📊 Total meshes found: ${allMeshes.length}`);
    console.log(
      `📊 Meshes with morph targets: ${allMeshes.filter(m => m.morphTargets > 0).length}`
    );

    scene.traverse(child => {
      if (child instanceof THREE.SkinnedMesh) {
        // Look for head-related meshes that have morph targets
        if (
          child.morphTargetInfluences &&
          child.morphTargetInfluences.length > 0 &&
          (child.name.toLowerCase().includes('head') ||
            child.name.toLowerCase().includes('face') ||
            child.name.toLowerCase().includes('wolf3d_head') ||
            child.material?.name?.toLowerCase().includes('head'))
        ) {
          foundHeadMesh = child;
          console.log(
            `🎭 Found head mesh: ${child.name} with ${child.morphTargetInfluences.length} morph targets`
          );

          // Log available morph targets for debugging
          if (child.morphTargetDictionary) {
            const availableMorphs = Object.keys(child.morphTargetDictionary);
            console.log('📋 Available morph targets:', availableMorphs);
            console.log(
              `📊 Total morph targets found: ${availableMorphs.length}`
            );

            // Check for ARKit compatibility
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

            const presentARKitMorphs = arkitMorphs.filter(morph =>
              availableMorphs.includes(morph)
            );
            const missingARKitMorphs = arkitMorphs.filter(
              morph => !availableMorphs.includes(morph)
            );
            const extraMorphs = availableMorphs.filter(
              morph => !arkitMorphs.includes(morph)
            );

            console.log(
              `🎯 ARKit morph targets present (${presentARKitMorphs.length}/52):`,
              presentARKitMorphs
            );
            console.log(
              `❌ ARKit morph targets missing (${missingARKitMorphs.length}/52):`,
              missingARKitMorphs
            );
            if (extraMorphs.length > 0) {
              console.log(
                `➕ Additional (non-ARKit) morph targets (${extraMorphs.length}):`,
                extraMorphs
              );
            }

            // Check for additional common morph targets
            const commonExtraMorphs = [
              'mouthOpen',
              'mouthSmile',
              'eyesClosed',
              'eyesLookUp',
              'eyesLookDown',
            ];
            const presentExtraMorphs = commonExtraMorphs.filter(morph =>
              availableMorphs.includes(morph)
            );
            if (presentExtraMorphs.length > 0) {
              console.log(
                `🔧 Common additional morph targets present:`,
                presentExtraMorphs
              );
            }

            // Dynamically update facial expressions based on available morph targets
            console.log(
              '🔄 Updating facial expressions based on available morph targets...'
            );

            // Update happy expression based on available morphs
            const happyExpression: { [key: string]: number } = {};
            if (availableMorphs.includes('mouthSmileLeft'))
              happyExpression.mouthSmileLeft = 0.8;
            if (availableMorphs.includes('mouthSmileRight'))
              happyExpression.mouthSmileRight = 0.8;
            if (availableMorphs.includes('mouthSmile'))
              happyExpression.mouthSmile = 0.7;
            if (availableMorphs.includes('jawOpen'))
              happyExpression.jawOpen = 0.1;
            if (availableMorphs.includes('cheekSquintLeft'))
              happyExpression.cheekSquintLeft = 0.3;
            if (availableMorphs.includes('cheekSquintRight'))
              happyExpression.cheekSquintRight = 0.3;
            if (Object.keys(happyExpression).length > 0) {
              FACIAL_EXPRESSIONS.happy = happyExpression;
              console.log('✅ Updated happy expression:', happyExpression);
            }

            // Update sad expression
            const sadExpression: { [key: string]: number } = {};
            if (availableMorphs.includes('mouthFrownLeft'))
              sadExpression.mouthFrownLeft = 0.7;
            if (availableMorphs.includes('mouthFrownRight'))
              sadExpression.mouthFrownRight = 0.7;
            if (availableMorphs.includes('browDownLeft'))
              sadExpression.browDownLeft = 0.5;
            if (availableMorphs.includes('browDownRight'))
              sadExpression.browDownRight = 0.5;
            if (availableMorphs.includes('mouthLowerDownLeft'))
              sadExpression.mouthLowerDownLeft = 0.3;
            if (availableMorphs.includes('mouthLowerDownRight'))
              sadExpression.mouthLowerDownRight = 0.3;
            // Fallback for basic sad expression
            if (
              Object.keys(sadExpression).length === 0 &&
              availableMorphs.includes('mouthSmile')
            ) {
              sadExpression.mouthSmile = -0.3;
            }
            if (Object.keys(sadExpression).length > 0) {
              FACIAL_EXPRESSIONS.sad = sadExpression;
              console.log('✅ Updated sad expression:', sadExpression);
            }

            // Update surprised expression
            const surprisedExpression: { [key: string]: number } = {};
            if (availableMorphs.includes('eyeWideLeft'))
              surprisedExpression.eyeWideLeft = 0.9;
            if (availableMorphs.includes('eyeWideRight'))
              surprisedExpression.eyeWideRight = 0.9;
            if (availableMorphs.includes('jawOpen'))
              surprisedExpression.jawOpen = 0.7;
            if (availableMorphs.includes('mouthFunnel'))
              surprisedExpression.mouthFunnel = 0.4;
            if (availableMorphs.includes('browInnerUp'))
              surprisedExpression.browInnerUp = 0.6;
            if (availableMorphs.includes('browOuterUpLeft'))
              surprisedExpression.browOuterUpLeft = 0.5;
            if (availableMorphs.includes('browOuterUpRight'))
              surprisedExpression.browOuterUpRight = 0.5;
            // Fallback
            if (Object.keys(surprisedExpression).length === 0) {
              if (availableMorphs.includes('mouthOpen'))
                surprisedExpression.mouthOpen = 0.6;
              if (availableMorphs.includes('mouthSmile'))
                surprisedExpression.mouthSmile = 0.2;
            }
            if (Object.keys(surprisedExpression).length > 0) {
              FACIAL_EXPRESSIONS.surprised = surprisedExpression;
              console.log(
                '✅ Updated surprised expression:',
                surprisedExpression
              );
            }

            // Update coughing expression
            const coughingExpression: { [key: string]: number } = {};
            if (availableMorphs.includes('jawOpen'))
              coughingExpression.jawOpen = 0.5;
            if (availableMorphs.includes('mouthOpen'))
              coughingExpression.mouthOpen = 0.6;
            if (availableMorphs.includes('eyeSquintLeft'))
              coughingExpression.eyeSquintLeft = 0.4;
            if (availableMorphs.includes('eyeSquintRight'))
              coughingExpression.eyeSquintRight = 0.4;
            if (availableMorphs.includes('browDownLeft'))
              coughingExpression.browDownLeft = 0.3;
            if (availableMorphs.includes('browDownRight'))
              coughingExpression.browDownRight = 0.3;
            // Fallback
            if (Object.keys(coughingExpression).length === 0) {
              if (availableMorphs.includes('mouthOpen'))
                coughingExpression.mouthOpen = 0.7;
              if (availableMorphs.includes('mouthSmile'))
                coughingExpression.mouthSmile = -0.1;
            }
            if (Object.keys(coughingExpression).length > 0) {
              FACIAL_EXPRESSIONS.coughing = coughingExpression;
              console.log(
                '✅ Updated coughing expression:',
                coughingExpression
              );
            }

            console.log(
              '🎭 Final facial expressions configuration:',
              FACIAL_EXPRESSIONS
            );

            // Update the test expression with the first available morph target
            if (availableMorphs.length > 0) {
              const testMorph = availableMorphs[0];
              FACIAL_EXPRESSIONS.test = { [testMorph]: 0.8 };
              console.log(`🧪 Test expression will use: ${testMorph} = 0.8`);
            }

            // Check which expression morph targets are available
            const allExpressionMorphs = new Set<string>();

            Object.values(FACIAL_EXPRESSIONS).forEach(expression => {
              Object.keys(expression).forEach(morph =>
                allExpressionMorphs.add(morph)
              );
            });

            const missingMorphs = Array.from(allExpressionMorphs).filter(
              morph => !availableMorphs.includes(morph)
            );

            const presentMorphs = Array.from(allExpressionMorphs).filter(
              morph => availableMorphs.includes(morph)
            );

            if (presentMorphs.length > 0) {
              console.log(
                '✅ Present expression morph targets:',
                presentMorphs
              );
            }

            if (missingMorphs.length > 0) {
              console.log(
                '❌ Missing morph targets for expressions:',
                missingMorphs
              );
            }

            console.log(
              '📊 Expression system compatibility:',
              Math.round(
                ((allExpressionMorphs.size - missingMorphs.length) /
                  allExpressionMorphs.size) *
                  100
              ) + '%'
            );

            // Look for common patterns in morph target names
            const patterns = {
              mouth: availableMorphs.filter(m =>
                m.toLowerCase().includes('mouth')
              ),
              eye: availableMorphs.filter(m => m.toLowerCase().includes('eye')),
              brow: availableMorphs.filter(m =>
                m.toLowerCase().includes('brow')
              ),
              jaw: availableMorphs.filter(m => m.toLowerCase().includes('jaw')),
              smile: availableMorphs.filter(m =>
                m.toLowerCase().includes('smile')
              ),
              frown: availableMorphs.filter(m =>
                m.toLowerCase().includes('frown')
              ),
            };

            console.log('🔍 Morph target patterns found:');
            Object.entries(patterns).forEach(([pattern, morphs]) => {
              if (morphs.length > 0) {
                console.log(`  ${pattern}:`, morphs);
              }
            });
          }
        }
      }
    });

    // If no head mesh found, try a more aggressive search
    if (!foundHeadMesh) {
      console.log(
        '⚠️ No head-specific mesh found, searching ALL meshes with morph targets...'
      );

      let bestMesh: THREE.SkinnedMesh | null = null;
      let maxMorphTargets = 0;

      scene.traverse(child => {
        if (
          child instanceof THREE.SkinnedMesh &&
          child.morphTargetInfluences &&
          child.morphTargetInfluences.length > 0
        ) {
          console.log(
            `🔍 Alternative mesh: "${child.name}" with ${child.morphTargetInfluences.length} morph targets`
          );

          if (child.morphTargetInfluences.length > maxMorphTargets) {
            bestMesh = child;
            maxMorphTargets = child.morphTargetInfluences.length;
          }
        }
      });

      if (bestMesh) {
        console.log(
          `🎯 Using mesh with most morph targets: "${(bestMesh as THREE.SkinnedMesh).name}" (${maxMorphTargets} targets)`
        );
        foundHeadMesh = bestMesh as THREE.SkinnedMesh;

        // Log the morph targets for this mesh
        const mesh = bestMesh as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary) {
          console.log(
            '📋 Morph targets in selected mesh:',
            Object.keys(mesh.morphTargetDictionary)
          );
        }
      }
    }

    // Add avatar URL diagnostics
    console.log('🔗 Avatar URL analysis:');
    console.log(`  URL: ${url}`);
    console.log(`  File extension: ${url.split('.').pop()}`);
    console.log(
      `  Is Ready Player Me URL: ${url.includes('readyplayerme') || url.includes('rpm')}`
    );

    if (!foundHeadMesh) {
      console.error('❌ No mesh with morph targets found in the entire scene!');
      console.log('💡 This could mean:');
      console.log("  - The avatar wasn't exported with facial blend shapes");
      console.log("  - The file format doesn't support morph targets");
      console.log('  - The avatar is an older version without ARKit support');
      console.log(
        '  - The morph targets are on a different mesh than expected'
      );
    }

    return foundHeadMesh;
  };

  // Adjust camera position based on active animation
  useEffect(() => {
    const targetPosition = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    if (activeAnimation === 'mixamo.com') {
      targetPosition.set(-3, 1.2, 4);
    } else if (activeAnimation === 'sleeping') {
      targetPosition.set(0.5, 4.8, 4.8);
      targetLookAt.set(0, -1.2, -2.0);
    } else {
      targetPosition.set(0, 0.5, 5);
      targetLookAt.set(0, 0, 0);
    }

    // Smooth camera transition
    const animate = () => {
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(targetLookAt);

      if (camera.position.distanceTo(targetPosition) > 0.01) {
        requestAnimationFrame(animate);
      }
    };

    animate();
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
  useEffect(() => {
    if (scene) {
      console.log(
        'Scene loaded. Configuring materials for mobile compatibility.'
      );

      const compatibleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1,
      });

      scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (
            child.material &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            child.material.envMapIntensity = 0.5;
            child.material.needsUpdate = true;

            // Apply skin tone adjustment to skin materials
            if (
              skinToneAdjustment !== 0 &&
              (child.name.toLowerCase().includes('body') ||
                child.name.toLowerCase().includes('head') ||
                child.name.toLowerCase().includes('face') ||
                child.name.toLowerCase().includes('arm') ||
                child.name.toLowerCase().includes('leg') ||
                child.material.name?.toLowerCase().includes('skin') ||
                child.material.name?.toLowerCase().includes('body'))
            ) {
              // Create a copy of the material to avoid affecting other meshes
              const adjustedMaterial = child.material.clone();

              // Get the current color
              const currentColor = adjustedMaterial.color.clone();

              if (skinToneAdjustment > 0) {
                // Lighten: lerp towards white
                currentColor.lerp(new THREE.Color(1, 1, 1), skinToneAdjustment);
              } else {
                // Darken: lerp towards darker brown/black
                currentColor.lerp(
                  new THREE.Color(0.2, 0.15, 0.1),
                  Math.abs(skinToneAdjustment)
                );
              }

              adjustedMaterial.color = currentColor;
              adjustedMaterial.needsUpdate = true;
              child.material = adjustedMaterial;

              console.log(
                `Applied skin tone adjustment ${skinToneAdjustment} to mesh: ${child.name}`
              );
            }
          } else {
            child.material = compatibleMaterial;
          }

          if (Platform.OS !== 'android') {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        }
      });

      sceneRef.current = scene;
      console.log('Model materials configured for mobile.');
    }
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
          asset: require('../../../assets/animations/yawn.glb'),
          name: 'yawn',
        },
        {
          asset: require('../../../assets/animations/sleeping.glb'),
          name: 'sleeping',
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
        console.log(
          'Avatar skeleton bones:',
          skeleton.bones.map((bone: THREE.Bone) => bone.name)
        );

        glbAnimations.forEach((clip: THREE.AnimationClip, index: number) => {
          try {
            console.log(`Setting up GLB animation ${index}: ${clip.name}`);

            const filteredTracks = clip.tracks.filter(track => {
              const trackParts = track.name.split('.');
              if (trackParts.length >= 2) {
                const boneName = trackParts[0];

                const findMatchingBone = (animationBoneName: string) => {
                  let matchedBone = skeleton.bones.find(
                    (bone: THREE.Bone) => bone.name === animationBoneName
                  );

                  if (matchedBone) return matchedBone;

                  // Common animation bone name to ReadyPlayerMe mappings
                  const boneMapping: { [key: string]: string } = {
                    // Core body bones
                    mixamorigHips: 'Hips',
                    mixamorigSpine: 'Spine',
                    mixamorigSpine1: 'Spine1',
                    mixamorigSpine2: 'Spine2',
                    mixamorigNeck: 'Neck',
                    mixamorigHead: 'Head',
                    mixamorigHeadTop_End: 'HeadTop_End',

                    // Left arm bones
                    mixamorigLeftShoulder: 'LeftShoulder',
                    mixamorigLeftArm: 'LeftUpperArm',
                    mixamorigLeftForeArm: 'LeftLowerArm',
                    mixamorigLeftHand: 'LeftHand',

                    // Left hand finger bones
                    mixamorigLeftHandThumb1: 'LeftHandThumb1',
                    mixamorigLeftHandThumb2: 'LeftHandThumb2',
                    mixamorigLeftHandThumb3: 'LeftHandThumb3',
                    mixamorigLeftHandThumb4: 'LeftHandThumb4',
                    mixamorigLeftHandIndex1: 'LeftHandIndex1',
                    mixamorigLeftHandIndex2: 'LeftHandIndex2',
                    mixamorigLeftHandIndex3: 'LeftHandIndex3',
                    mixamorigLeftHandIndex4: 'LeftHandIndex4',
                    mixamorigLeftHandMiddle1: 'LeftHandMiddle1',
                    mixamorigLeftHandMiddle2: 'LeftHandMiddle2',
                    mixamorigLeftHandMiddle3: 'LeftHandMiddle3',
                    mixamorigLeftHandMiddle4: 'LeftHandMiddle4',
                    mixamorigLeftHandRing1: 'LeftHandRing1',
                    mixamorigLeftHandRing2: 'LeftHandRing2',
                    mixamorigLeftHandRing3: 'LeftHandRing3',
                    mixamorigLeftHandRing4: 'LeftHandRing4',
                    mixamorigLeftHandPinky1: 'LeftHandPinky1',
                    mixamorigLeftHandPinky2: 'LeftHandPinky2',
                    mixamorigLeftHandPinky3: 'LeftHandPinky3',
                    mixamorigLeftHandPinky4: 'LeftHandPinky4',

                    // Right arm bones
                    mixamorigRightShoulder: 'RightShoulder',
                    mixamorigRightArm: 'RightUpperArm',
                    mixamorigRightForeArm: 'RightLowerArm',
                    mixamorigRightHand: 'RightHand',

                    // Right hand finger bones
                    mixamorigRightHandThumb1: 'RightHandThumb1',
                    mixamorigRightHandThumb2: 'RightHandThumb2',
                    mixamorigRightHandThumb3: 'RightHandThumb3',
                    mixamorigRightHandThumb4: 'RightHandThumb4',
                    mixamorigRightHandIndex1: 'RightHandIndex1',
                    mixamorigRightHandIndex2: 'RightHandIndex2',
                    mixamorigRightHandIndex3: 'RightHandIndex3',
                    mixamorigRightHandIndex4: 'RightHandIndex4',
                    mixamorigRightHandMiddle1: 'RightHandMiddle1',
                    mixamorigRightHandMiddle2: 'RightHandMiddle2',
                    mixamorigRightHandMiddle3: 'RightHandMiddle3',
                    mixamorigRightHandMiddle4: 'RightHandMiddle4',
                    mixamorigRightHandRing1: 'RightHandRing1',
                    mixamorigRightHandRing2: 'RightHandRing2',
                    mixamorigRightHandRing3: 'RightHandRing3',
                    mixamorigRightHandRing4: 'RightHandRing4',
                    mixamorigRightHandPinky1: 'RightHandPinky1',
                    mixamorigRightHandPinky2: 'RightHandPinky2',
                    mixamorigRightHandPinky3: 'RightHandPinky3',
                    mixamorigRightHandPinky4: 'RightHandPinky4',

                    // Left leg bones
                    mixamorigLeftUpLeg: 'LeftUpperLeg',
                    mixamorigLeftLeg: 'LeftLowerLeg',
                    mixamorigLeftFoot: 'LeftFoot',
                    mixamorigLeftToeBase: 'LeftToeBase',
                    mixamorigLeftToe_End: 'LeftToe_End',
                    // Additional Mixamo toe bone variations
                    mixamorigLeftToeBase_End: 'LeftToe_End',
                    'mixamorig:LeftToeBase': 'LeftToeBase',
                    'mixamorig:LeftToe_End': 'LeftToe_End',

                    // Right leg bones
                    mixamorigRightUpLeg: 'RightUpperLeg',
                    mixamorigRightLeg: 'RightLowerLeg',
                    mixamorigRightFoot: 'RightFoot',
                    mixamorigRightToeBase: 'RightToeBase',
                    mixamorigRightToe_End: 'RightToe_End',
                    // Additional Mixamo toe bone variations
                    mixamorigRightToeBase_End: 'RightToe_End',
                    'mixamorig:RightToeBase': 'RightToeBase',
                    'mixamorig:RightToe_End': 'RightToe_End',

                    // Direct mappings for animations that already use ReadyPlayerMe naming
                    Hips: 'Hips',
                    Spine: 'Spine',
                    Spine1: 'Spine1',
                    Spine2: 'Spine2',
                    Neck: 'Neck',
                    Head: 'Head',
                    HeadTop_End: 'HeadTop_End',
                    LeftShoulder: 'LeftShoulder',
                    LeftArm: 'LeftArm',
                    LeftForeArm: 'LeftForeArm',
                    LeftHand: 'LeftHand',
                    LeftHandThumb1: 'LeftHandThumb1',
                    LeftHandThumb2: 'LeftHandThumb2',
                    LeftHandThumb3: 'LeftHandThumb3',
                    LeftHandThumb4: 'LeftHandThumb4',
                    LeftHandIndex1: 'LeftHandIndex1',
                    LeftHandIndex2: 'LeftHandIndex2',
                    LeftHandIndex3: 'LeftHandIndex3',
                    LeftHandIndex4: 'LeftHandIndex4',
                    LeftHandMiddle1: 'LeftHandMiddle1',
                    LeftHandMiddle2: 'LeftHandMiddle2',
                    LeftHandMiddle3: 'LeftHandMiddle3',
                    LeftHandMiddle4: 'LeftHandMiddle4',
                    LeftHandRing1: 'LeftHandRing1',
                    LeftHandRing2: 'LeftHandRing2',
                    LeftHandRing3: 'LeftHandRing3',
                    LeftHandRing4: 'LeftHandRing4',
                    LeftHandPinky1: 'LeftHandPinky1',
                    LeftHandPinky2: 'LeftHandPinky2',
                    LeftHandPinky3: 'LeftHandPinky3',
                    LeftHandPinky4: 'LeftHandPinky4',
                    RightShoulder: 'RightShoulder',
                    RightArm: 'RightArm',
                    RightForeArm: 'RightForeArm',
                    RightHand: 'RightHand',
                    RightHandThumb1: 'RightHandThumb1',
                    RightHandThumb2: 'RightHandThumb2',
                    RightHandThumb3: 'RightHandThumb3',
                    RightHandThumb4: 'RightHandThumb4',
                    RightHandIndex1: 'RightHandIndex1',
                    RightHandIndex2: 'RightHandIndex2',
                    RightHandIndex3: 'RightHandIndex3',
                    RightHandIndex4: 'RightHandIndex4',
                    RightHandMiddle1: 'RightHandMiddle1',
                    RightHandMiddle2: 'RightHandMiddle2',
                    RightHandMiddle3: 'RightHandMiddle3',
                    RightHandMiddle4: 'RightHandMiddle4',
                    RightHandRing1: 'RightHandRing1',
                    RightHandRing2: 'RightHandRing2',
                    RightHandRing3: 'RightHandRing3',
                    RightHandRing4: 'RightHandRing4',
                    RightHandPinky1: 'RightHandPinky1',
                    RightHandPinky2: 'RightHandPinky2',
                    RightHandPinky3: 'RightHandPinky3',
                    RightHandPinky4: 'RightHandPinky4',
                    // Fixed leg bone mappings to be consistent with Mixamo mappings
                    LeftUpLeg: 'LeftUpperLeg',
                    LeftLeg: 'LeftLowerLeg',
                    LeftFoot: 'LeftFoot',
                    LeftToeBase: 'LeftToeBase',
                    LeftToe_End: 'LeftToe_End',
                    RightUpLeg: 'RightUpperLeg',
                    RightLeg: 'RightLowerLeg',
                    RightFoot: 'RightFoot',
                    RightToeBase: 'RightToeBase',
                    RightToe_End: 'RightToe_End',

                    // Alternative ReadyPlayerMe toe bone names
                    LeftToes: 'LeftToeBase',
                    RightToes: 'RightToeBase',
                  };

                  const mappedName = boneMapping[animationBoneName];
                  if (mappedName) {
                    matchedBone = skeleton.bones.find(
                      (bone: THREE.Bone) => bone.name === mappedName
                    );
                  }

                  if (matchedBone) return matchedBone;

                  // Fallback: substring matching
                  matchedBone = skeleton.bones.find(
                    (bone: THREE.Bone) =>
                      bone.name
                        .toLowerCase()
                        .includes(animationBoneName.toLowerCase()) ||
                      animationBoneName
                        .toLowerCase()
                        .includes(bone.name.toLowerCase())
                  );

                  return matchedBone;
                };

                // FIX: Skip all toe-related bones to prevent hawk leg deformation
                const isToeRelatedBone = boneName.toLowerCase().includes('toe');

                if (isToeRelatedBone) {
                  console.log(
                    `FIX: Skipping toe-related bone ${boneName} to prevent toe deformation`
                  );
                  return false;
                }

                const matchedBone = findMatchingBone(boneName);
                if (!matchedBone) {
                  console.log(
                    `Skipping track for non-existent bone: ${boneName}`
                  );
                  return false;
                }

                if (matchedBone.name !== boneName) {
                  const property = trackParts[1];
                  track.name = `${matchedBone.name}.${property}`;
                  console.log(
                    `Remapped bone: ${boneName} -> ${matchedBone.name}`
                  );
                }

                return true;
              }
              return false;
            });

            if (filteredTracks.length > 0) {
              console.log(
                `Keeping ${filteredTracks.length}/${clip.tracks.length} tracks`
              );

              // Remove position and scale tracks to prevent avatar displacement
              // Also filter out problematic toe tracks that can cause deformation
              const safeTracks = filteredTracks.filter(track => {
                if (
                  track.name.includes('.position') ||
                  track.name.includes('.scale')
                ) {
                  console.log(
                    `Removing ${track.name} track to prevent avatar displacement/scaling`
                  );
                  return false;
                }

                // FIX: Remove ALL toe-related tracks to prevent hawk leg deformation
                const trackName = track.name.toLowerCase();
                const toeRelatedPatterns = ['toe', 'toebase', 'toe_end'];

                const isToeRelatedTrack = toeRelatedPatterns.some(pattern =>
                  trackName.includes(pattern.toLowerCase())
                );

                if (isToeRelatedTrack) {
                  console.log(
                    `FIX: Removing toe-related track ${track.name} to prevent toe deformation`
                  );
                  return false;
                }

                return true;
              });

              const filteredClip = new THREE.AnimationClip(
                clip.name + '_filtered',
                clip.duration,
                safeTracks
              );

              const action = mixer.clipAction(filteredClip);
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.clampWhenFinished = true;
              action.setEffectiveWeight(1.0);

              if (
                clip.name.toLowerCase().includes('mixamo') ||
                clip.name.toLowerCase().includes('cough')
              ) {
                action.setEffectiveTimeScale(1.0);
                console.log('Applied Mixamo-specific settings to animation');
              }

              actionsMap.set(clip.name, action);
            } else {
              console.warn(`No valid tracks found for animation: ${clip.name}`);
            }
          } catch (error) {
            console.error(`Error setting up FBX animation ${index}:`, error);
          }
        });

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
          action.setLoop(THREE.LoopRepeat, Infinity);
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
    console.log(
      `Animation state changed: activeAnimation=${activeAnimation}, available actions: ${animationActionsMap.size}`
    );

    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
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
    }
  }, [
    currentIdleIndex,
    activeAnimation,
    animationActionsMap,
    animationSpeedScale,
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
    <group position={activeAnimation === 'sleeping' ? [0, 0, 1.0] : [0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

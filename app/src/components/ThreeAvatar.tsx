import React, { Suspense, useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { useGLTF, OrbitControls } from "@react-three/drei/native";
import * as THREE from "three";
import { localStorageService } from "../services/LocalStorageService";
import { FBXAnimationLoader } from "../utils/FBXAnimationLoader";

// --- FIX 1: Correctly suppress EXGL warnings by targeting console.log ---
if (__DEV__) {
  const originalLog = console.log;
  console.log = (...args) => {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("EXGL: gl.pixelStorei()")
    ) {
      return; // Suppress EXGL pixelStorei warnings
    }
    originalLog.apply(console, args);
  };
}

// Configure Three.js for better mobile compatibility
THREE.ColorManagement.enabled = false;

// Preload and configure texture loader for React Native
const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";

// Helper function to retarget FBX animations to GLB skeleton
function retargetAnimationToSkeleton(
  clip: THREE.AnimationClip,
  targetSkeleton: THREE.Skeleton,
): THREE.AnimationClip {
  const clonedClip = clip.clone();

  clonedClip.tracks.forEach((track) => {
    // Extract bone name from track name (format: "BoneName.position" or "BoneName.quaternion")
    const trackParts = track.name.split(".");
    if (trackParts.length >= 2) {
      const boneName = trackParts[0];
      const property = trackParts[1];

      // Find corresponding bone in target skeleton using fuzzy matching
      const targetBone = targetSkeleton.bones.find((bone) => {
        const lowerBoneName = boneName.toLowerCase();
        const lowerTargetName = bone.name.toLowerCase();

        // Try exact match first
        if (lowerBoneName === lowerTargetName) return true;

        // Try partial matches
        if (
          lowerBoneName.includes(lowerTargetName) ||
          lowerTargetName.includes(lowerBoneName)
        )
          return true;

        // Try common bone name mappings
        const boneMapping: { [key: string]: string[] } = {
          hips: ["hip", "pelvis", "root"],
          spine: ["spine", "back"],
          head: ["head", "skull"],
          leftarm: ["left_arm", "l_arm", "arm_l"],
          rightarm: ["right_arm", "r_arm", "arm_r"],
          leftleg: ["left_leg", "l_leg", "leg_l"],
          rightleg: ["right_leg", "r_leg", "leg_r"],
        };

        for (const [standard, variants] of Object.entries(boneMapping)) {
          if (
            variants.some(
              (variant) =>
                lowerBoneName.includes(variant) &&
                lowerTargetName.includes(standard),
            )
          ) {
            return true;
          }
          if (
            variants.some(
              (variant) =>
                lowerTargetName.includes(variant) &&
                lowerBoneName.includes(standard),
            )
          ) {
            return true;
          }
        }

        return false;
      });

      if (targetBone) {
        // Update track name to match target bone
        track.name = `${targetBone.name}.${property}`;
        console.log(`Retargeted ${boneName} -> ${targetBone.name}`);
      } else {
        console.warn(`Could not find target bone for: ${boneName}`);
      }
    }
  });

  return clonedClip;
}

// Override Three.js texture loading to prevent EXGL issues
const originalLoad = textureLoader.load.bind(textureLoader);
textureLoader.load = function (url, onLoad, onProgress, onError) {
  return originalLoad(
    url,
    (texture) => {
      // Configure texture to avoid EXGL warnings
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = false;
      if (onLoad) onLoad(texture);
    },
    onProgress,
    onError,
  );
};

function AvatarModel({
  url,
  activeAnimation,
}: {
  url: string;
  activeAnimation: string | null;
}) {
  const { scene, animations } = useGLTF(url);
  const { camera } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [animationActionsMap, setAnimationActionsMap] = useState<
    Map<string, THREE.AnimationAction>
  >(new Map());
  const [fbxAnimations, setFbxAnimations] = useState<THREE.AnimationClip[]>([]);
  const sceneRef = useRef<THREE.Group | null>(null);

  // Adjust camera position based on active animation
  useEffect(() => {
    const targetPosition = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    
    if (activeAnimation === "mixamo.com") {
      // Position camera for left side view of coughing animation
      targetPosition.set(-3, 0.2, 4);
    } else {
      // Default front view position
      targetPosition.set(0, 0.5, 5);
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

  // This effect runs once after the scene is loaded.
  useEffect(() => {
    if (scene) {
      console.log(
        "Scene loaded. Configuring materials for mobile compatibility.",
      );

      // Create a more realistic material that still works well on mobile
      const compatibleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1,
      });

      // Go through every single part of the loaded 3D model.
      scene.traverse((child) => {
        // If the part is a mesh (i.e., something with geometry and a material)...
        if (child instanceof THREE.Mesh) {
          // Keep original material if it's compatible, otherwise use fallback
          if (
            child.material &&
            child.material instanceof THREE.MeshStandardMaterial
          ) {
            // Configure existing material for mobile
            child.material.envMapIntensity = 0.5;
            child.material.needsUpdate = true;
          } else {
            // Replace incompatible materials
            child.material = compatibleMaterial;
          }

          // Enable shadow casting and receiving
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Store reference to scene for animations
      sceneRef.current = scene;
      console.log("Model materials configured for mobile.");
    }
  }, [scene]);

  // Load FBX animations
  useEffect(() => {
    if (!scene) return;

    console.log("Loading FBX animations...");
    const loadFBXAnimations = async () => {
      try {
        const fbxLoader = new FBXAnimationLoader();

        // Use proper asset URLs for React Native - these need to be served via Metro bundler
        const animationPromises = [
          fbxLoader.loadFBXAnimation(
            "http://10.10.0.126:8080/animations/M_Standing_Expressions_007.fbx",
          ),
          fbxLoader.loadFBXAnimation(
            "http://10.10.0.126:8080/animations/laying_severe_cough.fbx",
          ),
        ];

        const loadedAnimations = await Promise.allSettled(animationPromises);

        const successfulAnimations: THREE.AnimationClip[] = [];
        loadedAnimations.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            console.log(`Successfully loaded FBX animation ${index + 1}`);
            // Flatten the array since loadFBXAnimation returns an array of clips
            successfulAnimations.push(...result.value);
          } else {
            console.warn(
              `Failed to load FBX animation ${index + 1}:`,
              result.status === "rejected" ? result.reason : "Unknown error",
            );
          }
        });

        if (successfulAnimations.length > 0) {
          console.log(
            `Loaded ${successfulAnimations.length} FBX animation clips`,
          );
          setFbxAnimations(successfulAnimations);
        } else {
          console.log("No FBX animations loaded, will use fallback");
        }
      } catch (error) {
        console.error("Error loading FBX animations:", error);
      }
    };

    loadFBXAnimations();
  }, [scene]);

  // Set up animations - prioritize FBX, then GLB, then fallback
  useEffect(() => {
    if (!scene) return;

    console.log("Setting up animation mixer...");

    // Clean up existing mixer
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    // Create new animation mixer
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    const actionsMap = new Map<string, THREE.AnimationAction>();

    // Priority 1: Use FBX animations if available (with careful application)
    if (fbxAnimations.length > 0) {
      console.log(`Setting up ${fbxAnimations.length} FBX animations...`);

      // Find the skeleton from the GLB avatar
      let avatarSkeleton: THREE.Skeleton | null = null;
      let avatarSkinnedMesh: THREE.SkinnedMesh | null = null;
      scene.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          avatarSkeleton = child.skeleton;
          avatarSkinnedMesh = child;
          console.log(
            "Found avatar skeleton with",
            child.skeleton.bones.length,
            "bones",
          );
        }
      });

      if (avatarSkeleton && avatarSkinnedMesh) {
        const skeleton = avatarSkeleton as THREE.Skeleton; // Explicit cast to avoid TS issues
        console.log(
          "Avatar skeleton bones:",
          skeleton.bones.map((bone: THREE.Bone) => bone.name),
        );

        // Store the original bone transforms
        const originalBoneTransforms = new Map();
        skeleton.bones.forEach((bone: THREE.Bone) => {
          originalBoneTransforms.set(bone.uuid, {
            position: bone.position.clone(),
            quaternion: bone.quaternion.clone(),
            scale: bone.scale.clone(),
          });
        });

        fbxAnimations.forEach((clip: THREE.AnimationClip, index: number) => {
          try {
            console.log(`Setting up FBX animation ${index}: ${clip.name}`);
            console.log(
              "FBX animation tracks:",
              clip.tracks.map((track) => track.name),
            );

            // Create a filtered version of the animation that only affects existing bones
            const filteredTracks = clip.tracks.filter((track) => {
              const trackParts = track.name.split(".");
              if (trackParts.length >= 2) {
                const boneName = trackParts[0];
                
                // Create a mapping function for Mixamo to ReadyPlayerMe bones
                const findMatchingBone = (fbxBoneName: string) => {
                  // Direct match first
                  let matchedBone = skeleton.bones.find(
                    (bone: THREE.Bone) => bone.name === fbxBoneName
                  );
                  
                  if (matchedBone) return matchedBone;
                  
                  // Try common Mixamo to ReadyPlayerMe mappings
                  const boneMapping: { [key: string]: string } = {
                    'mixamorigHips': 'Hips',
                    'mixamorigSpine': 'Spine',
                    'mixamorigSpine1': 'Spine1',
                    'mixamorigSpine2': 'Spine2',
                    'mixamorigNeck': 'Neck',
                    'mixamorigHead': 'Head',
                    'mixamorigLeftShoulder': 'LeftShoulder',
                    'mixamorigLeftArm': 'LeftUpperArm',
                    'mixamorigLeftForeArm': 'LeftLowerArm',
                    'mixamorigLeftHand': 'LeftHand',
                    'mixamorigRightShoulder': 'RightShoulder',
                    'mixamorigRightArm': 'RightUpperArm',
                    'mixamorigRightForeArm': 'RightLowerArm',
                    'mixamorigRightHand': 'RightHand',
                    'mixamorigLeftUpLeg': 'LeftUpperLeg',
                    'mixamorigLeftLeg': 'LeftLowerLeg',
                    'mixamorigLeftFoot': 'LeftFoot',
                    'mixamorigRightUpLeg': 'RightUpperLeg',
                    'mixamorigRightLeg': 'RightLowerLeg',
                    'mixamorigRightFoot': 'RightFoot',
                  };
                  
                  const mappedName = boneMapping[fbxBoneName];
                  if (mappedName) {
                    matchedBone = skeleton.bones.find(
                      (bone: THREE.Bone) => bone.name === mappedName
                    );
                  }
                  
                  if (matchedBone) return matchedBone;
                  
                  // Fallback: try substring matching
                  matchedBone = skeleton.bones.find(
                    (bone: THREE.Bone) =>
                      bone.name.toLowerCase().includes(fbxBoneName.toLowerCase()) ||
                      fbxBoneName.toLowerCase().includes(bone.name.toLowerCase())
                  );
                  
                  return matchedBone;
                };
                
                const matchedBone = findMatchingBone(boneName);
                if (!matchedBone) {
                  console.log(
                    `Skipping track for non-existent bone: ${boneName}`,
                  );
                  return false;
                }
                
                // Update track name to match the target bone
                if (matchedBone.name !== boneName) {
                  const property = trackParts[1];
                  track.name = `${matchedBone.name}.${property}`;
                  console.log(`Remapped bone: ${boneName} -> ${matchedBone.name}`);
                }
                
                return true;
              }
              return false;
            });

            if (filteredTracks.length > 0) {
              console.log(
                `Keeping ${filteredTracks.length}/${clip.tracks.length} tracks`,
              );

              // Filter out position tracks for root bone to prevent avatar displacement
              // Remove ALL position tracks to keep avatar in place - only use rotation and scale
              const safeTracks = filteredTracks.filter((track) => {
                if (track.name.includes(".position")) {
                  console.log(
                    `Removing ${track.name} track to prevent avatar displacement`,
                  );
                  return false;
                }
                // Also filter out any scale tracks that might make avatar invisible
                if (track.name.includes(".scale")) {
                  console.log(
                    `Removing ${track.name} track to prevent avatar scaling issues`,
                  );
                  return false;
                }
                return true;
              });

              // Create a new clip with only the safe tracks
              const filteredClip = new THREE.AnimationClip(
                clip.name + "_filtered",
                clip.duration,
                safeTracks,
              );

              const action = mixer.clipAction(filteredClip);
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.clampWhenFinished = true;

              // Use full weight for well-retargeted animations
              action.setEffectiveWeight(1.0);
              
              // Adjust timing for different animation types
              if (clip.name.toLowerCase().includes("mixamo") || clip.name.toLowerCase().includes("cough")) {
                // Mixamo animations might need speed adjustment
                action.setEffectiveTimeScale(1.0);
                console.log("Applied Mixamo-specific settings to animation");
              }

              // Store action by animation name
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
            `Successfully set up ${actionsMap.size} filtered FBX animations`,
          );
          console.log(
            "Available animation names:",
            Array.from(actionsMap.keys()),
          );
          setAnimationActionsMap(actionsMap);
          return;
        }
      } else {
        console.warn(
          "No skeleton found in avatar, cannot apply FBX animations",
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
      "No FBX or GLB animations found, creating simple idle animation...",
    );

    try {
      // Find the best target for animation (preferably skinned mesh or armature)
      let targetObject: THREE.Object3D = scene;
      let foundSkinned = false;

      scene.traverse((child) => {
        if (!foundSkinned && child instanceof THREE.SkinnedMesh) {
          targetObject = child;
          foundSkinned = true;
          console.log("Found SkinnedMesh for animation:", child.name);
        } else if (
          !foundSkinned &&
          (child.name.toLowerCase().includes("avatar") ||
            child.name.toLowerCase().includes("armature") ||
            child.name.toLowerCase().includes("skeleton"))
        ) {
          targetObject = child;
          console.log("Found potential animation target:", child.name);
        }
      });

      console.log(
        "Creating fallback animation for:",
        targetObject.name || "scene",
      );

      // Create a very subtle breathing animation
      const times = [0, 1, 2];
      const scaleValues = [1, 1.01, 1]; // Very subtle scale change

      const scaleKF = new THREE.VectorKeyframeTrack(
        targetObject.uuid + ".scale",
        times,
        scaleValues.flatMap((val) => [val, val, val]),
      );

      const clip = new THREE.AnimationClip("idle_breathing", 2, [scaleKF]);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);

      actionsMap.set("idle_breathing", action);
      setAnimationActionsMap(actionsMap);
      console.log("Created fallback idle animation");
    } catch (error) {
      console.error("Error creating fallback animation:", error);
      setAnimationActionsMap(new Map());
    }
  }, [scene, animations, fbxAnimations]);

  // Control animation playback
  useEffect(() => {
    console.log(
      `Animation state changed: activeAnimation=${activeAnimation}, available actions: ${animationActionsMap.size}`,
    );

    if (animationActionsMap.size > 0) {
      // Stop all currently running animations and reset avatar to safe state
      animationActionsMap.forEach(
        (action: THREE.AnimationAction, name: string) => {
          if (action.isRunning()) {
            console.log(`Stopping animation: ${name}`);
            action.stop();
          }
        },
      );

      // When stopping animations, ensure avatar is in a safe state
      if (!activeAnimation && scene) {
        scene.traverse((child) => {
          if (child instanceof THREE.SkinnedMesh) {
            // Reset to safe defaults
            child.visible = true;
            child.scale.set(1, 1, 1);
            child.position.x = 0;
            child.position.z = 0;
            console.log("Reset avatar to safe state after stopping animations");
          }
        });
      }

      // Start the requested animation if specified
      if (activeAnimation && animationActionsMap.has(activeAnimation)) {
        const action = animationActionsMap.get(activeAnimation)!;
        try {
          console.log(`Starting animation: ${activeAnimation}`);
          
          // Store original transforms before starting animation
          const originalTransforms = new Map();
          if (scene) {
            scene.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh) {
                originalTransforms.set(child.uuid, {
                  position: child.position.clone(),
                  scale: child.scale.clone(),
                  visible: child.visible
                });
              }
            });
          }
          
          action.reset();
          action.setEffectiveWeight(1);
          action.setEffectiveTimeScale(1);
          action.play();

          // Immediately after starting, ensure avatar stays visible and in position
          if (scene) {
            scene.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh) {
                const original = originalTransforms.get(child.uuid);
                if (original) {
                  // Keep original position and scale to prevent disappearing
                  child.position.copy(original.position);
                  child.scale.copy(original.scale);
                  child.visible = true;
                }
                
                console.log(
                  `Avatar mesh position: x:${child.position.x.toFixed(2)}, y:${child.position.y.toFixed(2)}, z:${child.position.z.toFixed(2)}`,
                );
                console.log(
                  `Avatar mesh scale: x:${child.scale.x.toFixed(2)}, y:${child.scale.y.toFixed(2)}, z:${child.scale.z.toFixed(2)}`,
                );
                console.log(`Avatar mesh visible: ${child.visible}`);
              }
            });
          }

          // Log some debug info about the animation
          console.log(`Animation duration: ${action.getClip().duration}s`);
          console.log(`Animation tracks: ${action.getClip().tracks.length}`);

        } catch (error) {
          console.error(`Error starting animation ${activeAnimation}:`, error);
        }
      } else if (activeAnimation) {
        console.warn(`Animation not found: ${activeAnimation}`);
      } else {
        console.log("No animation requested, all animations stopped");
      }
    } else {
      console.log("No animation actions available");
    }
  }, [activeAnimation, animationActionsMap, scene]);

  // Update animation mixer each frame
  useFrame((state, delta) => {
    if (mixerRef.current) {
      try {
        mixerRef.current.update(delta);

        // Continuously check and fix avatar visibility during animations
        if (scene && activeAnimation) {
          scene.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh) {
              // Fix common issues that cause avatar to disappear
              if (!child.visible) {
                console.warn("Avatar became invisible during animation, fixing...");
                child.visible = true;
              }
              
              // Fix scale issues
              if (child.scale.x < 0.01 || child.scale.y < 0.01 || child.scale.z < 0.01) {
                console.warn("Avatar became too small during animation, fixing...");
                child.scale.set(1, 1, 1);
              }
              
              // Fix position issues and adjust for specific animations
              if (Math.abs(child.position.x) > 10 || Math.abs(child.position.z) > 10) {
                console.warn("Avatar moved too far during animation, fixing...");
                child.position.x = 0;
                child.position.z = 0;
              }
              
              // Adjust Y position for coughing animation to be lower
              if (activeAnimation === "mixamo.com") {
                // Keep the coughing animation lower
                if (child.position.y > -0.2) {
                  child.position.y = -0.2;
                }
              }
            }
          });
        }

        // Debug: Log mixer state occasionally (every 60 frames ≈ 1 second)
        if (
          activeAnimation &&
          Math.floor(state.clock.elapsedTime * 60) % 60 === 0
        ) {
          const runningActions = Array.from(
            animationActionsMap.values(),
          ).filter((action) => action.isRunning());
          console.log(
            `Mixer update - Active actions: ${runningActions.length}, Time: ${state.clock.elapsedTime.toFixed(1)}s`,
          );

          // Check if avatar is still visible
          if (scene) {
            scene.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh) {
                console.log(
                  `Avatar status - Visible: ${child.visible}, Scale: ${child.scale.x.toFixed(2)}, Position: ${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)}`,
                );
              }
            });
          }
        }
      } catch (error) {
        console.error("Animation mixer update error:", error);
      }
    }
  });

  // Return the modified scene.
  return <primitive object={scene} />;
}

interface ThreeAvatarProps {
  showAnimationButton?: boolean;
  width?: number;
  height?: number;
}

const ThreeAvatar: React.FC<ThreeAvatarProps> = ({
  showAnimationButton = false,
  width = 300,
  height = 500,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const canvasRef = useRef<any>(null);

  // Available animations - we'll detect these dynamically from the loaded FBX files
  const availableAnimations = [
    { name: "M_Standing_Expressions_007", label: "Expressions" },
    { name: "mixamo.com", label: "Cough" }, // This is the actual name from the Mixamo animation
  ];

  useEffect(() => {
    // Simplified loading logic
    const loadAvatar = async () => {
      try {
        console.log("Attempting to load avatar URL...");
        let url = await localStorageService.getAvatarUrl();
        if (!url) {
          console.log("No saved URL, using fallback.");
          url = "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb";
        } else {
          console.log(`Found saved URL: ${url}`);
        }

        setAvatarUrl(url);
      } catch (err) {
        console.error("Error loading avatar:", err);
        setError("Failed to load avatar");
      }
    };

    loadAvatar();
  }, []);

  const handleAnimationToggle = (animationName: string) => {
    if (activeAnimation === animationName) {
      // Stop the current animation
      console.log(`Stopping animation: ${animationName}`);
      setActiveAnimation(null);
    } else {
      // Start the new animation
      console.log(`Starting animation: ${animationName}`);
      setActiveAnimation(animationName);
    }
  };

  if (!avatarUrl) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#3182CE" />
        <Text style={styles.loadingText}>Loading avatar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas
        ref={canvasRef}
        gl={{
          // These settings are vital for mobile.
          antialias: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        // Place the camera to show full avatar (including head)
        camera={{ 
          position: [0, 0.5, 5], 
          fov: 60 
        }}
        // This onCreated is crucial for material rendering.
        onCreated={({ gl, scene }) => {
          console.log("Canvas created. Configuring renderer...");
          gl.setClearColor("#f0f0f0");
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          console.log("Renderer configured.");
        }}
      >
        {/* Improved lighting setup */}
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, 5]} intensity={1} />

        <Suspense fallback={null}>
          <group 
            position={[0, -1.5, 0]} 
            scale={1.8}
          >
            <AvatarModel url={avatarUrl} activeAnimation={activeAnimation} />
          </group>
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          enabled={false}
        />
      </Canvas>

      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Your Digital Twin</Text>
      </View>

      {showAnimationButton && (
        <View style={styles.animationButtonsContainer}>
          {availableAnimations.map((animation, index) => (
            <TouchableOpacity
              key={animation.name}
              style={[
                styles.animationButton,
                activeAnimation === animation.name &&
                  styles.activeAnimationButton,
                {
                  marginBottom: index < availableAnimations.length - 1 ? 8 : 0,
                },
              ]}
              onPress={() => handleAnimationToggle(animation.name)}
            >
              <Text
                style={[
                  styles.animationButtonText,
                  activeAnimation === animation.name &&
                    styles.activeAnimationButtonText,
                ]}
              >
                {activeAnimation === animation.name
                  ? `Stop ${animation.label}`
                  : `Play ${animation.label}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 500,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#E53E3E",
    textAlign: "center",
    padding: 20,
  },
  debugContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 5,
  },
  debugText: {
    color: "white",
    textAlign: "center",
    fontSize: 12,
  },
  animationButtonsContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  animationButton: {
    backgroundColor: "#3182CE",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeAnimationButton: {
    backgroundColor: "#E53E3E",
  },
  animationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  activeAnimationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ThreeAvatar;

import * as THREE from 'three';

// Helper function to retarget FBX animations to GLB skeleton
export function retargetAnimationToSkeleton(
  clip: THREE.AnimationClip,
  targetSkeleton: THREE.Skeleton
): THREE.AnimationClip {
  const clonedClip = clip.clone();

  clonedClip.tracks.forEach(track => {
    // Extract bone name from track name (format: "BoneName.position" or "BoneName.quaternion")
    const trackParts = track.name.split('.');
    if (trackParts.length >= 2) {
      const boneName = trackParts[0];
      const property = trackParts[1];

      // Find corresponding bone in target skeleton using fuzzy matching
      const targetBone = targetSkeleton.bones.find(bone => {
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
          hips: ['hip', 'pelvis', 'root'],
          spine: ['spine', 'back'],
          head: ['head', 'skull'],
          leftarm: ['left_arm', 'l_arm', 'arm_l'],
          rightarm: ['right_arm', 'r_arm', 'arm_r'],
          leftleg: ['left_leg', 'l_leg', 'leg_l'],
          rightleg: ['right_leg', 'r_leg', 'leg_r'],
        };

        for (const [standard, variants] of Object.entries(boneMapping)) {
          if (
            variants.some(
              variant =>
                lowerBoneName.includes(variant) &&
                lowerTargetName.includes(standard)
            )
          ) {
            return true;
          }
          if (
            variants.some(
              variant =>
                lowerTargetName.includes(variant) &&
                lowerBoneName.includes(standard)
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

// Configure Three.js for better mobile compatibility
export function configureMobileCompatibility() {
  THREE.ColorManagement.enabled = false;
}

// Configure texture loader for React Native
export function configureTextureLoader() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  // Override Three.js texture loading to prevent EXGL issues
  const originalLoad = textureLoader.load.bind(textureLoader);
  textureLoader.load = function (url, onLoad, onProgress, onError) {
    return originalLoad(
      url,
      texture => {
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
      onError
    );
  };

  return textureLoader;
}

export function buildBoneRemapper(skeleton: THREE.Skeleton) {
  const nameToBone = new Map<string, THREE.Bone>();
  skeleton.bones.forEach(b => nameToBone.set(b.name, b));

  // Static mapping table hoisted once (outside the loop if you want)
  const boneMapping: Record<string, string> = {
    // Core
    mixamorigHips: 'Hips',
    mixamorigSpine: 'Spine',
    mixamorigSpine1: 'Spine1',
    mixamorigSpine2: 'Spine2',
    mixamorigNeck: 'Neck',
    mixamorigHead: 'Head',
    mixamorigHeadTop_End: 'HeadTop_End',
    // Left arm
    mixamorigLeftShoulder: 'LeftShoulder',
    mixamorigLeftArm: 'LeftUpperArm',
    mixamorigLeftForeArm: 'LeftLowerArm',
    mixamorigLeftHand: 'LeftHand',
    // Left hand fingers…
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
    // Right arm
    mixamorigRightShoulder: 'RightShoulder',
    mixamorigRightArm: 'RightUpperArm',
    mixamorigRightForeArm: 'RightLowerArm',
    mixamorigRightHand: 'RightHand',
    // Right hand fingers…
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
    // Legs
    mixamorigLeftUpLeg: 'LeftUpperLeg',
    mixamorigLeftLeg: 'LeftLowerLeg',
    mixamorigLeftFoot: 'LeftFoot',
    mixamorigLeftToeBase: 'LeftToeBase',
    mixamorigLeftToe_End: 'LeftToe_End',
    mixamorigRightUpLeg: 'RightUpperLeg',
    mixamorigRightLeg: 'RightLowerLeg',
    mixamorigRightFoot: 'RightFoot',
    mixamorigRightToeBase: 'RightToeBase',
    mixamorigRightToe_End: 'RightToe_End',
    // Variants
    'mixamorig:LeftToeBase': 'LeftToeBase',
    'mixamorig:LeftToe_End': 'LeftToe_End',
    'mixamorig:RightToeBase': 'RightToeBase',
    'mixamorig:RightToe_End': 'RightToe_End',
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
    LeftToes: 'LeftToeBase',
    RightToes: 'RightToeBase',
    // Identity for already-matching names
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
    RightShoulder: 'RightShoulder',
    RightArm: 'RightArm',
    RightForeArm: 'RightForeArm',
    RightHand: 'RightHand',
  };

  const propDeny = new Set(['position', 'scale']);
  const toeRegex = /toe|toebase|toe_end/i;

  function remap(animationBoneName: string): THREE.Bone | undefined {
    // direct
    let bone = nameToBone.get(animationBoneName);
    if (bone) return bone;
    // mapped
    const mapped = boneMapping[animationBoneName];
    if (mapped) return nameToBone.get(mapped);
    // fuzzy
    const lower = animationBoneName.toLowerCase();
    return skeleton.bones.find(
      b =>
        b.name.toLowerCase().includes(lower) ||
        lower.includes(b.name.toLowerCase())
    );
  }

  return { propDeny, toeRegex, remap };
}

// Suppress EXGL warnings in development
export function suppressEXGLWarnings() {
  if (__DEV__) {
    const originalLog = console.log;
    console.log = (...args) => {
      if (
        args[0] &&
        typeof args[0] === 'string' &&
        args[0].includes('EXGL: gl.pixelStorei()')
      ) {
        return; // Suppress EXGL pixelStorei warnings
      }
      originalLog.apply(console, args);
    };
  }
}

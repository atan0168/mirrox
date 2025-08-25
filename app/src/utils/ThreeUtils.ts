import * as THREE from "three";

// Helper function to retarget FBX animations to GLB skeleton
export function retargetAnimationToSkeleton(
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

// Configure Three.js for better mobile compatibility
export function configureMobileCompatibility() {
  THREE.ColorManagement.enabled = false;
}

// Configure texture loader for React Native
export function configureTextureLoader() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = "anonymous";

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

  return textureLoader;
}

// Suppress EXGL warnings in development
export function suppressEXGLWarnings() {
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
}

import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';
import AnimationPreloaderService from '../services/AnimationPreloaderService';

/**
 * Utility class for loading FBX animations and applying them to GLB avatars
 * Note: FBX files need to be accessible via URL in React Native
 */
export class FBXAnimationLoader {
  private loader: FBXLoader;

  constructor() {
    this.loader = new FBXLoader();
  }

  /**
   * Load FBX animation clips only (without applying to avatar)
   * Uses the preloader service for efficient caching
   * @param fbxUrl - URL to the FBX file
   * @returns Promise<THREE.AnimationClip[]>
   */
  async loadFBXAnimation(fbxUrl: string): Promise<THREE.AnimationClip[] | null> {
    try {
      console.log('Loading FBX animation clips from:', fbxUrl);
      
      // Use preloader service to get cached file
      const localPath = await AnimationPreloaderService.getAnimation(fbxUrl);
      
      // Load the FBX file from local path
      const fbxScene = await new Promise<THREE.Group>((resolve, reject) => {
        this.loader.load(
          localPath,
          (object) => resolve(object),
          (progress) => console.log('Loading progress:', progress),
          (error) => reject(error)
        );
      });

      if (!fbxScene.animations || fbxScene.animations.length === 0) {
        console.warn('No animations found in FBX file');
        return null;
      }

      console.log(`Successfully loaded ${fbxScene.animations.length} animation clips`);
      return fbxScene.animations;

    } catch (error) {
      console.error('Error loading FBX animation:', error);
      return null;
    }
  }

  /**
   * Load FBX animation and apply to avatar scene
   * Uses the preloader service for efficient caching
   * @param fbxUrl - URL to the FBX file (must be accessible via HTTP/HTTPS)
   * @param avatarScene - The loaded GLB avatar scene
   * @returns Promise<THREE.AnimationMixer | null>
   */
  async loadAnimationForAvatar(
    fbxUrl: string, 
    avatarScene: THREE.Object3D
  ): Promise<THREE.AnimationMixer | null> {
    try {
      console.log('Loading FBX animation from:', fbxUrl);
      
      // Use preloader service to get cached file
      const localPath = await AnimationPreloaderService.getAnimation(fbxUrl);
      
      // Load the FBX file from local path
      const fbxScene = await new Promise<THREE.Group>((resolve, reject) => {
        this.loader.load(
          localPath,
          (object) => resolve(object),
          (progress) => console.log('Loading progress:', progress),
          (error) => reject(error)
        );
      });

      if (!fbxScene.animations || fbxScene.animations.length === 0) {
        console.warn('No animations found in FBX file');
        return null;
      }

      // Find the skinned mesh in the avatar
      const avatarSkinnedMesh = this.findSkinnedMesh(avatarScene);
      if (!avatarSkinnedMesh) {
        console.warn('No skinned mesh found in avatar');
        return null;
      }

      // Create animation mixer for the avatar
      const mixer = new THREE.AnimationMixer(avatarSkinnedMesh);

      // Apply animations to the avatar
      fbxScene.animations.forEach((clip, index) => {
        console.log(`Applying animation ${index}: ${clip.name}`);
        
        // Clone the animation clip to avoid conflicts
        const clonedClip = clip.clone();
        
        // Retarget the animation to the avatar's skeleton
        this.retargetAnimation(clonedClip, avatarSkinnedMesh.skeleton);
        
        // Create and configure action
        const action = mixer.clipAction(clonedClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
      });

      console.log(`Successfully loaded ${fbxScene.animations.length} animations`);
      return mixer;

    } catch (error) {
      console.error('Error loading FBX animation:', error);
      return null;
    }
  }

  /**
   * Find the first skinned mesh in a scene
   */
  private findSkinnedMesh(scene: THREE.Object3D): THREE.SkinnedMesh | null {
    let skinnedMesh: THREE.SkinnedMesh | null = null;
    
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && !skinnedMesh) {
        skinnedMesh = child;
      }
    });
    
    return skinnedMesh;
  }

  /**
   * Retarget animation to a different skeleton
   * This is a simplified version - full retargeting is complex
   */
  private retargetAnimation(clip: THREE.AnimationClip, targetSkeleton: THREE.Skeleton): void {
    // This is a simplified retargeting - in practice, you might need more sophisticated bone mapping
    clip.tracks.forEach(track => {
      // Extract bone name from track name (format: "BoneName.position" or "BoneName.quaternion")
      const trackParts = track.name.split('.');
      if (trackParts.length >= 2) {
        const boneName = trackParts[0];
        const property = trackParts[1];
        
        // Find corresponding bone in target skeleton
        const targetBone = targetSkeleton.bones.find(bone => 
          bone.name.toLowerCase().includes(boneName.toLowerCase()) ||
          boneName.toLowerCase().includes(bone.name.toLowerCase())
        );
        
        if (targetBone) {
          // Update track name to match target bone
          track.name = `${targetBone.name}.${property}`;
        }
      }
    });
  }
}

export const fbxAnimationLoader = new FBXAnimationLoader();

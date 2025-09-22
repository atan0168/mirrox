import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three-stdlib';
import { Asset } from 'expo-asset';

/**
 * Utility class for loading GLB animations and applying them to GLB avatars
 * GLB format is more efficient and widely supported compared to FBX
 */
export class GLBAnimationLoader {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load GLB animation clips only (without applying to avatar)
   * @param glbUrl - URL to the GLB file
   * @returns Promise<THREE.AnimationClip[]>
   */
  async loadGLBAnimation(
    glbUrl: string
  ): Promise<THREE.AnimationClip[] | null> {
    try {
      console.log('Loading GLB animation clips from:', glbUrl);

      // Load the GLB file
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.loader.load(
          glbUrl,
          gltf => resolve(gltf),
          progress => console.log('Loading progress:', progress),
          error => reject(error)
        );
      });

      if (!gltf.animations || gltf.animations.length === 0) {
        console.warn('No animations found in GLB file');
        return null;
      }

      console.log(
        `Successfully loaded ${gltf.animations.length} animation clips from GLB`
      );
      return gltf.animations;
    } catch (error) {
      console.error('Error loading GLB animation:', error);
      return null;
    }
  }

  /**
   * Load GLB animation clips from a local asset
   * @param assetModule - The require() result for the local asset
   * @returns Promise<THREE.AnimationClip[]>
   */
  async loadGLBAnimationFromAsset(
    assetModule: number
  ): Promise<THREE.AnimationClip[] | null> {
    try {
      console.log('Loading GLB animation clips from local asset...');

      // Get the asset URI from the module
      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();
      const assetUri = asset.localUri || asset.uri;

      console.log('Asset URI:', assetUri);

      // Load the GLB file
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.loader.load(
          assetUri,
          gltf => resolve(gltf),
          progress => console.log('Loading progress:', progress),
          error => reject(error)
        );
      });

      if (!gltf.animations || gltf.animations.length === 0) {
        console.warn('No animations found in GLB file');
        return null;
      }

      console.log(
        `Successfully loaded ${gltf.animations.length} animation clips from local GLB asset`
      );
      return gltf.animations;
    } catch (error) {
      console.error('Error loading GLB animation from asset:', error);
      return null;
    }
  }

  /**
   * Load GLB animation and apply to avatar scene
   * @param glbUrl - URL to the GLB file (must be accessible via HTTP/HTTPS)
   * @param avatarScene - The avatar scene to apply animations to
   * @returns Promise<THREE.AnimationAction[]>
   */
  async loadAndApplyAnimation(
    glbUrl: string,
    avatarScene: THREE.Group
  ): Promise<THREE.AnimationAction[]> {
    try {
      const animations = await this.loadGLBAnimation(glbUrl);

      if (!animations) {
        throw new Error('Failed to load animations from GLB file');
      }

      // Create animation mixer if not exists
      let mixer = avatarScene.userData.mixer as THREE.AnimationMixer;
      if (!mixer) {
        mixer = new THREE.AnimationMixer(avatarScene);
        avatarScene.userData.mixer = mixer;
      }

      // Create animation actions
      const actions: THREE.AnimationAction[] = [];
      animations.forEach(clip => {
        try {
          const action = mixer.clipAction(clip);
          actions.push(action);
          console.log(`Created action for animation: ${clip.name}`);
        } catch (error) {
          console.warn(`Failed to create action for clip ${clip.name}:`, error);
        }
      });

      return actions;
    } catch (error) {
      console.error('Error loading and applying GLB animation:', error);
      return [];
    }
  }

  /**
   * Load multiple GLB animations from URLs
   * @param animationUrls - Array of URLs to GLB animation files
   * @returns Promise<THREE.AnimationClip[]>
   */
  async loadMultipleAnimations(
    animationUrls: string[]
  ): Promise<THREE.AnimationClip[]> {
    const allAnimations: THREE.AnimationClip[] = [];

    for (const url of animationUrls) {
      try {
        const animations = await this.loadGLBAnimation(url);
        if (animations) {
          allAnimations.push(...animations);
        }
      } catch (error) {
        console.warn(`Failed to load animation from ${url}:`, error);
      }
    }

    return allAnimations;
  }

  /**
   * Get animation clip by name from a loaded GLB file
   * @param glbUrl - URL to the GLB file
   * @param animationName - Name of the animation to retrieve
   * @returns Promise<THREE.AnimationClip | null>
   */
  async getAnimationClipByName(
    glbUrl: string,
    animationName: string
  ): Promise<THREE.AnimationClip | null> {
    try {
      const animations = await this.loadGLBAnimation(glbUrl);
      if (!animations) return null;

      return animations.find(clip => clip.name === animationName) || null;
    } catch (error) {
      console.error('Error getting animation clip by name:', error);
      return null;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // GLTFLoader doesn't require explicit disposal
    // but we can clear any cached data if needed
  }
}

export default GLBAnimationLoader;

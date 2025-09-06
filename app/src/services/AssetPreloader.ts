import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { GLBAnimationLoader } from '../utils/GLBAnimationLoader';
import { localStorageService } from './LocalStorageService';

export interface PreloadProgress {
  loaded: number;
  total: number;
  currentItem: string;
  percentage: number;
}

export interface PreloadedAssets {
  avatar: {
    url: string | null;
    cached: boolean;
  };
  animations: {
    [key: string]: any; // Animation clips
  };
  images: {
    [key: string]: string; // Local URIs
  };
  ready: boolean;
}

/**
 * AssetPreloader - Preloads and caches all app assets during splash screen
 *
 * This service ensures that:
 * 1. Avatar GLB files are downloaded and cached locally
 * 2. Animation GLB files are preloaded and ready
 * 3. Image assets are preloaded
 * 4. All assets are available instantly when needed
 */
export class AssetPreloader {
  private static instance: AssetPreloader;
  private preloadedAssets: PreloadedAssets | null = null;
  private isPreloading = false;

  private constructor() {}

  public static getInstance(): AssetPreloader {
    if (!AssetPreloader.instance) {
      AssetPreloader.instance = new AssetPreloader();
    }
    return AssetPreloader.instance;
  }

  /**
   * Get preloaded assets if available
   */
  public getPreloadedAssets(): PreloadedAssets | null {
    return this.preloadedAssets;
  }

  /**
   * Check if assets are already preloaded
   */
  public isReady(): boolean {
    return this.preloadedAssets?.ready === true;
  }

  /**
   * Preload all application assets
   */
  public async preloadAssets(
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<PreloadedAssets> {
    if (this.isPreloading) {
      throw new Error('Asset preloading already in progress');
    }

    if (this.preloadedAssets?.ready) {
      return this.preloadedAssets;
    }

    this.isPreloading = true;

    try {
      console.log('🚀 Starting asset preloading...');

      // Initialize preloaded assets structure
      this.preloadedAssets = {
        avatar: { url: null, cached: false },
        animations: {},
        images: {},
        ready: false,
      };

      // Define all assets to preload
      const animationAssets = [
        {
          asset: require('../../assets/animations/M_Standing_Expressions_007.glb'),
          name: 'M_Standing_Expressions_007',
        },
        {
          asset: require('../../assets/animations/M_Standing_Idle_Variations_003.glb'),
          name: 'M_Standing_Idle_Variations_003',
        },
        {
          asset: require('../../assets/animations/M_Standing_Idle_Variations_007.glb'),
          name: 'M_Standing_Idle_Variations_007',
        },
        {
          asset: require('../../assets/animations/wiping_sweat.glb'),
          name: 'wiping_sweat',
        },
        {
          asset: require('../../assets/animations/breathing.glb'),
          name: 'breathing',
        },
        {
          asset: require('../../assets/animations/shock.glb'),
          name: 'shock',
        },
        {
          asset: require('../../assets/animations/swat_bugs.glb'),
          name: 'swat_bugs',
        },
        {
          asset: require('../../assets/animations/yawn.glb'),
          name: 'yawn',
        },
        {
          asset: require('../../assets/animations/sleeping.glb'),
          name: 'sleeping',
        },
      ];

      const imageAssets = [
        {
          asset: require('../../assets/smoke-default.png'),
          name: 'smoke-default',
        },
        {
          asset: require('../../assets/avatar2d.png'),
          name: 'avatar2d',
        },
      ];

      // Calculate total items to preload
      const totalItems = 1 + animationAssets.length + imageAssets.length; // 1 for avatar + animations + images
      let loadedItems = 0;

      const updateProgress = (currentItem: string) => {
        const progress: PreloadProgress = {
          loaded: loadedItems,
          total: totalItems,
          currentItem,
          percentage: Math.round((loadedItems / totalItems) * 100),
        };
        onProgress?.(progress);
      };

      // Step 1: Preload avatar
      updateProgress('Loading avatar...');
      try {
        const avatarUrl = await localStorageService.getAvatarWithCaching();
        this.preloadedAssets.avatar = {
          url: avatarUrl,
          cached: avatarUrl ? avatarUrl.startsWith('file://') : false,
        };
        console.log(
          '✅ Avatar preloaded:',
          avatarUrl ? 'cached locally' : 'not found'
        );
      } catch (error) {
        console.warn('⚠️ Avatar preload failed:', error);
      }
      loadedItems++;

      // Step 2: Preload animations
      console.log('🎬 Preloading animations...');
      const glbLoader = new GLBAnimationLoader();

      for (const { asset, name } of animationAssets) {
        updateProgress(`Loading animation: ${name}...`);
        try {
          const animations = await glbLoader.loadGLBAnimationFromAsset(asset);
          if (animations) {
            this.preloadedAssets.animations[name] = animations;
            console.log(
              `✅ Animation preloaded: ${name} (${animations.length} clips)`
            );
          } else {
            console.warn(`⚠️ Animation preload failed: ${name}`);
          }
        } catch (error) {
          console.warn(`⚠️ Animation preload error for ${name}:`, error);
        }
        loadedItems++;
        updateProgress(`Loaded animation: ${name}`);
      }

      // Step 3: Preload images
      console.log('🖼️ Preloading images...');
      for (const { asset, name } of imageAssets) {
        updateProgress(`Loading image: ${name}...`);
        try {
          const assetInstance = Asset.fromModule(asset);
          await assetInstance.downloadAsync();
          const uri = assetInstance.localUri || assetInstance.uri;
          this.preloadedAssets.images[name] = uri;
          console.log(`✅ Image preloaded: ${name}`);
        } catch (error) {
          console.warn(`⚠️ Image preload error for ${name}:`, error);
        }
        loadedItems++;
        updateProgress(`Loaded image: ${name}`);
      }

      // Mark as ready
      this.preloadedAssets.ready = true;
      updateProgress('Assets ready!');

      console.log('🎉 Asset preloading completed successfully');
      console.log('📊 Preloaded assets summary:', {
        avatar: this.preloadedAssets.avatar.url ? 'loaded' : 'not found',
        animations: Object.keys(this.preloadedAssets.animations).length,
        images: Object.keys(this.preloadedAssets.images).length,
      });

      return this.preloadedAssets;
    } catch (error) {
      console.error('❌ Asset preloading failed:', error);
      throw error;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Get preloaded avatar URL
   */
  public getPreloadedAvatarUrl(): string | null {
    return this.preloadedAssets?.avatar.url || null;
  }

  /**
   * Get preloaded animation clips by name
   */
  public getPreloadedAnimation(name: string): any[] | null {
    return this.preloadedAssets?.animations[name] || null;
  }

  /**
   * Get all preloaded animations
   */
  public getAllPreloadedAnimations(): { [key: string]: any } {
    return this.preloadedAssets?.animations || {};
  }

  /**
   * Get preloaded image URI
   */
  public getPreloadedImageUri(name: string): string | null {
    return this.preloadedAssets?.images[name] || null;
  }

  /**
   * Clear preloaded assets (useful for memory management)
   */
  public clearPreloadedAssets(): void {
    this.preloadedAssets = null;
    console.log('🧹 Preloaded assets cleared');
  }

  /**
   * Refresh avatar cache (useful when avatar changes)
   */
  public async refreshAvatarCache(): Promise<void> {
    if (!this.preloadedAssets) return;

    try {
      console.log('🔄 Refreshing avatar cache...');
      const avatarUrl = await localStorageService.getAvatarWithCaching();
      this.preloadedAssets.avatar = {
        url: avatarUrl,
        cached: avatarUrl ? avatarUrl.startsWith('file://') : false,
      };
      console.log('✅ Avatar cache refreshed');
    } catch (error) {
      console.warn('⚠️ Avatar cache refresh failed:', error);
    }
  }
}

// Export singleton instance
export const assetPreloader = AssetPreloader.getInstance();

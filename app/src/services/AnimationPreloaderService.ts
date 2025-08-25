import AnimationCacheService from './AnimationCacheService';

export interface AnimationConfig {
  url: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
}

export class AnimationPreloaderService {
  private static instance: AnimationPreloaderService;
  private isPreloading = false;
  private preloadedAnimations: Set<string> = new Set();

  // Define all animations that should be preloaded
  private animationConfigs: AnimationConfig[] = [
    {
      url: "http://10.10.0.126:8080/animations/M_Standing_Expressions_007.fbx",
      name: "M_Standing_Expressions_007",
      priority: 'high'
    },
    {
      url: "http://10.10.0.126:8080/animations/laying_severe_cough.fbx", 
      name: "laying_severe_cough",
      priority: 'high'
    },
    {
      url: "https://github.com/readyplayerme/animation-library/raw/refs/heads/master/masculine/fbx/idle/M_Standing_Idle_Variations_006.fbx",
      name: "M_Standing_Idle_Variations_006",
      priority: 'medium'
    },
    {
      url: "https://github.com/readyplayerme/animation-library/raw/refs/heads/master/masculine/fbx/idle/M_Standing_Idle_Variations_003.fbx",
      name: "M_Standing_Idle_Variations_003",
      priority: 'medium'
    },
    {
      url: "https://github.com/readyplayerme/animation-library/raw/refs/heads/master/masculine/fbx/idle/M_Standing_Idle_Variations_001.fbx",
      name: "M_Standing_Idle_Variations_001",
      priority: 'low'
    },
    {
      url: "https://github.com/readyplayerme/animation-library/raw/refs/heads/master/masculine/fbx/idle/M_Standing_Idle_Variations_002.fbx",
      name: "M_Standing_Idle_Variations_002",
      priority: 'low'
    },
  ];

  public static getInstance(): AnimationPreloaderService {
    if (!AnimationPreloaderService.instance) {
      AnimationPreloaderService.instance = new AnimationPreloaderService();
    }
    return AnimationPreloaderService.instance;
  }

  /**
   * Check if an animation is already preloaded
   */
  public isAnimationPreloaded(url: string): boolean {
    return this.preloadedAnimations.has(url);
  }

  /**
   * Get all animation configurations
   */
  public getAnimationConfigs(): AnimationConfig[] {
    return [...this.animationConfigs];
  }

  /**
   * Add a new animation configuration
   */
  public addAnimationConfig(config: AnimationConfig): void {
    const existingIndex = this.animationConfigs.findIndex(c => c.url === config.url);
    if (existingIndex >= 0) {
      this.animationConfigs[existingIndex] = config;
    } else {
      this.animationConfigs.push(config);
    }
  }

  /**
   * Preload animations by priority
   */
  public async preloadAnimations(
    priority: 'high' | 'medium' | 'low' | 'all' = 'all',
    onProgress?: (current: number, total: number, currentName: string) => void
  ): Promise<void> {
    if (this.isPreloading) {
      console.log('🔄 Animation preloading already in progress');
      return;
    }

    this.isPreloading = true;
    console.log(`🎬 Starting animation preloading (priority: ${priority})`);

    try {
      // Filter animations by priority
      let animationsToLoad = this.animationConfigs;
      if (priority !== 'all') {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const minPriority = priorityOrder[priority];
        animationsToLoad = this.animationConfigs.filter(
          config => priorityOrder[config.priority] >= minPriority
        );
      }

      // Sort by priority (high first)
      animationsToLoad.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      let loadedCount = 0;
      const totalAnimations = animationsToLoad.length;

      for (const config of animationsToLoad) {
        try {
          if (onProgress) {
            onProgress(loadedCount, totalAnimations, config.name);
          }

          // Check if already cached
          const isCached = await AnimationCacheService.isCached(config.url);
          
          if (isCached) {
            console.log(`✅ Animation ${config.name} already cached`);
          } else {
            console.log(`📥 Preloading ${config.name} (${config.priority} priority)`);
            
            await AnimationCacheService.getOrCacheFile(config.url, (progress) => {
              // Optional: report individual file progress
            });
          }

          this.preloadedAnimations.add(config.url);
          loadedCount++;

          if (onProgress) {
            onProgress(loadedCount, totalAnimations, config.name);
          }

        } catch (error) {
          console.warn(`⚠️ Failed to preload animation ${config.name}:`, error);
          loadedCount++; // Still count as processed
        }
      }

      console.log(`🎉 Animation preloading complete: ${loadedCount}/${totalAnimations} animations processed`);

    } catch (error) {
      console.error('❌ Error during animation preloading:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload only high priority animations for quick startup
   */
  public async preloadCriticalAnimations(
    onProgress?: (current: number, total: number, currentName: string) => void
  ): Promise<void> {
    return this.preloadAnimations('high', onProgress);
  }

  /**
   * Continue preloading medium and low priority animations in background
   */
  public async preloadRemainingAnimations(
    onProgress?: (current: number, total: number, currentName: string) => void
  ): Promise<void> {
    // Preload medium priority first, then low
    await this.preloadAnimations('medium', onProgress);
    await this.preloadAnimations('low', onProgress);
  }

  /**
   * Get an animation from cache or download if needed
   */
  public async getAnimation(url: string, onProgress?: (progress: number) => void): Promise<string> {
    // Mark as preloaded once accessed
    this.preloadedAnimations.add(url);
    return AnimationCacheService.getOrCacheFile(url, onProgress);
  }

  /**
   * Get preloading statistics
   */
  public async getPreloadingStats(): Promise<{
    totalConfigs: number;
    preloadedCount: number;
    cacheStats: any;
  }> {
    const cacheStats = await AnimationCacheService.getCacheStats();
    
    return {
      totalConfigs: this.animationConfigs.length,
      preloadedCount: this.preloadedAnimations.size,
      cacheStats
    };
  }

  /**
   * Clear preloaded animations list (not the cache)
   */
  public clearPreloadedList(): void {
    this.preloadedAnimations.clear();
  }
}

export default AnimationPreloaderService.getInstance();

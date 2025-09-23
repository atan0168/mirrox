import { useHydrationStore } from '../store/hydrationStore';
import { useAvatarStore } from '../store/avatarStore';
import { localStorageService } from './LocalStorageService';
import { apiService } from './ApiService';
import { assetPreloader } from './AssetPreloader';
import {
  calculateBaselineHydrationGoal,
  calculateHeatIndexCategory,
  adjustHydrationForClimate,
  calculateActivityFluidLoss,
} from '../utils/hydrationUtils';
import { UserProfile } from '../models/User';
import type { ExerciseSessionData } from './health/types';

const DEFAULT_BASE_GOAL = 2000;
const DAY_CHECK_INTERVAL_MS = 15 * 60 * 1000; // refresh context every 15 minutes

const toDayString = (date: Date): string => date.toISOString().split('T')[0];

export class HydrationService {
  private static instance: HydrationService | null = null;
  private dayCheckInterval: NodeJS.Timeout | null = null;
  private hydrationAnimationTimeout: NodeJS.Timeout | null = null;
  private previousAnimationBeforeHydration: string | null = null;
  private isInitialized = false;

  static getInstance(): HydrationService {
    if (!HydrationService.instance) {
      HydrationService.instance = new HydrationService();
    }
    return HydrationService.instance;
  }

  private constructor() {}

  /**
   * Initialize the hydration service and ensure today's context is ready
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.checkForNewDay(true);
      this.startDayChangeWatcher();
      this.isInitialized = true;
      console.log('[HydrationService] Initialized successfully');
    } catch (error) {
      console.error('[HydrationService] Failed to initialise:', error);
      throw error;
    }
  }

  private startDayChangeWatcher(): void {
    if (this.dayCheckInterval) {
      clearInterval(this.dayCheckInterval);
    }

    this.dayCheckInterval = setInterval(() => {
      this.checkForNewDay().catch(error =>
        console.warn('[HydrationService] Failed periodic day check:', error)
      );
    }, DAY_CHECK_INTERVAL_MS);
  }

  private async resolveBaseHydrationGoal(
    userProfile: UserProfile | null
  ): Promise<number> {
    const storeBaseline =
      useHydrationStore.getState().baselineGoalMl ?? DEFAULT_BASE_GOAL;

    if (!userProfile) {
      return storeBaseline;
    }

    let profileChanged = false;
    let baselineFromWeight: number | null = null;

    if (typeof userProfile.weightKg === 'number' && userProfile.weightKg > 0) {
      baselineFromWeight = calculateBaselineHydrationGoal(userProfile.weightKg);

      if (userProfile.hydrationBaselineMl !== baselineFromWeight) {
        userProfile.hydrationBaselineMl = baselineFromWeight;
        profileChanged = true;
      }

      if (!userProfile.hydrationGoalMl) {
        userProfile.hydrationGoalMl = baselineFromWeight;
        profileChanged = true;
      }
    }

    if (profileChanged) {
      await localStorageService.saveUserProfile(userProfile);
    }

    const preferredGoal =
      userProfile.hydrationGoalMl ??
      baselineFromWeight ??
      storeBaseline ??
      DEFAULT_BASE_GOAL;

    return Math.max(500, Math.min(5000, Math.round(preferredGoal)));
  }

  private async computeClimateAdjustedGoal(
    baseGoal: number,
    userProfile: UserProfile | null
  ): Promise<number> {
    const safeBaseGoal = Math.max(500, Math.min(5000, Math.round(baseGoal)));

    if (!userProfile?.location) {
      return safeBaseGoal;
    }

    const { latitude, longitude } = userProfile.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.warn(
        '[HydrationService] Invalid location coordinates for climate adjustment'
      );
      return safeBaseGoal;
    }

    let temperature = 25;
    let humidity = 60;

    try {
      const airQuality = await apiService.fetchAQICNAirQuality(
        latitude,
        longitude
      );
      temperature = airQuality.temperature ?? temperature;
      humidity = airQuality.humidity ?? humidity;
    } catch (error) {
      console.warn(
        '[HydrationService] Failed to retrieve climate data, using defaults',
        error
      );
    }

    const heatIndexCategory = calculateHeatIndexCategory(temperature, humidity);
    const adjustedGoal = adjustHydrationForClimate(
      safeBaseGoal,
      heatIndexCategory
    );

    if (heatIndexCategory !== 'normal') {
      console.log(
        `[HydrationService] Climate-adjusted goal ${adjustedGoal}mL for ${heatIndexCategory} conditions`
      );
    }

    return adjustedGoal;
  }

  /**
   * Check if we need to roll over to a new day and refresh goals
   */
  async checkForNewDay(forceGoalRefresh = false): Promise<void> {
    try {
      const today = toDayString(new Date());
      const state = useHydrationStore.getState();
      const { currentDay, resetForNewDay, setBaselineGoal, setDailyGoal } =
        state;

      const userProfile = await localStorageService.getUserProfile();
      const baseGoal = await this.resolveBaseHydrationGoal(userProfile);
      const adjustedGoal = await this.computeClimateAdjustedGoal(
        baseGoal,
        userProfile
      );

      setBaselineGoal(baseGoal);
      setDailyGoal(adjustedGoal);

      if (forceGoalRefresh || currentDay !== today) {
        console.log(
          `[HydrationService] Hydration context refreshed for ${today}`
        );
      }

      resetForNewDay(today);
    } catch (error) {
      console.error(
        '[HydrationService] Failed to refresh daily context:',
        error
      );
    }
  }

  private getDrinkingAnimationDurationMs(): number {
    const clips = assetPreloader.getPreloadedAnimation('drinking');
    if (Array.isArray(clips) && clips.length > 0) {
      const clipWithDuration = clips.find(clip => {
        const duration = (clip as { duration?: number })?.duration;
        return typeof duration === 'number' && duration > 0;
      }) as { duration?: number } | undefined;

      if (clipWithDuration?.duration) {
        return Math.round(clipWithDuration.duration * 1000) + 500;
      }
    }

    // Fallback duration if we can't read clip metadata
    return 3500;
  }

  private triggerDrinkingAnimation(): void {
    try {
      const avatarState = useAvatarStore.getState();
      if (avatarState.isManualAnimation) {
        // Respect manual overrides; don't interrupt user-selected animations
        return;
      }

      const currentAnimation = avatarState.activeAnimation;
      if (currentAnimation !== 'drinking') {
        this.previousAnimationBeforeHydration = currentAnimation;
      }

      avatarState.setActiveAnimation('drinking', { manual: true });

      if (this.hydrationAnimationTimeout) {
        clearTimeout(this.hydrationAnimationTimeout);
      }

      const durationMs = this.getDrinkingAnimationDurationMs();

      this.hydrationAnimationTimeout = setTimeout(() => {
        const { activeAnimation, setActiveAnimation, clearManualAnimation } =
          useAvatarStore.getState();

        if (activeAnimation === 'drinking') {
          clearManualAnimation();

          if (this.previousAnimationBeforeHydration) {
            setActiveAnimation(this.previousAnimationBeforeHydration);
          } else {
            setActiveAnimation(null);
          }
        }

        this.previousAnimationBeforeHydration = null;
        this.hydrationAnimationTimeout = null;
      }, durationMs);
    } catch (error) {
      console.warn(
        '[HydrationService] Failed to trigger drinking animation:',
        error
      );
    }
  }

  /**
   * Log fluid intake
   */
  logFluidIntake(amountMl: number, fluidType?: string): void {
    try {
      const { logFluidIntake } = useHydrationStore.getState();
      logFluidIntake({ amountMl, fluidType });

      console.log(
        `[HydrationService] Logged ${amountMl}mL of ${fluidType || 'fluid'} intake`
      );

      if (amountMl > 0) {
        this.triggerDrinkingAnimation();
      }
    } catch (error) {
      console.error('[HydrationService] Failed to log fluid intake:', error);
    }
  }

  private metToIntensity(
    met: number
  ): 'low' | 'moderate' | 'high' | 'very_high' {
    if (!Number.isFinite(met) || met <= 0) {
      return 'low';
    }
    if (met < 3) return 'low';
    if (met < 6) return 'moderate';
    if (met < 9) return 'high';
    return 'very_high';
  }

  applyExerciseSessionsHydrationLoss(sessions: ExerciseSessionData[]): void {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return;
    }

    try {
      const { applyHydrationDeficitFromActivity } =
        useHydrationStore.getState();

      sessions.forEach(session => {
        const duration = Math.max(0, Math.round(session.durationMinutes));
        const met = session.metValue ?? null;
        const activityType = session.activityType || 'default';

        if (duration <= 0) {
          return;
        }

        const intensity = this.metToIntensity(met ?? 0);
        const deficit = calculateActivityFluidLoss(
          activityType,
          duration,
          intensity
        );

        if (deficit <= 0) {
          return;
        }

        applyHydrationDeficitFromActivity({
          activityId: session.id,
          amountMl: deficit,
        });

        console.log(
          `[HydrationService] Applied ${deficit}mL hydration deficit for ${activityType} (${duration} min, MET ${met ?? 'n/a'})`
        );
      });
    } catch (error) {
      console.error(
        '[HydrationService] Failed to apply exercise hydration loss:',
        error
      );
    }
  }

  /**
   * Get current hydration status
   */
  getCurrentHydrationStatus(): {
    currentHydrationMl: number;
    dailyGoalMl: number;
    progressPercentage: number;
    status:
      | 'severely_dehydrated'
      | 'dehydrated'
      | 'low'
      | 'adequate'
      | 'optimal'
      | 'over_hydrated';
  } {
    const {
      currentHydrationMl,
      dailyGoalMl,
      getProgressPercentage,
      getHydrationStatus,
    } = useHydrationStore.getState();

    return {
      currentHydrationMl,
      dailyGoalMl,
      progressPercentage: getProgressPercentage(),
      status: getHydrationStatus(),
    };
  }

  /**
   * Update user's hydration preferences
   */
  async updateHydrationPreferences(preferences: {
    customGoalMl?: number;
    weightKg?: number;
  }): Promise<void> {
    try {
      const userProfile = await localStorageService.getUserProfile();
      if (!userProfile) throw new Error('User profile not found');

      let profileChanged = false;

      if (preferences.weightKg !== undefined) {
        userProfile.weightKg = preferences.weightKg;
        profileChanged = true;
      }

      if (preferences.customGoalMl !== undefined) {
        userProfile.hydrationGoalMl = preferences.customGoalMl;
        profileChanged = true;
      }

      if (profileChanged) {
        await localStorageService.saveUserProfile(userProfile);
        await this.checkForNewDay(true);
      }

      console.log('[HydrationService] Updated hydration preferences');
    } catch (error) {
      console.error('[HydrationService] Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.dayCheckInterval) {
      clearInterval(this.dayCheckInterval);
      this.dayCheckInterval = null;
    }
    if (this.hydrationAnimationTimeout) {
      clearTimeout(this.hydrationAnimationTimeout);
      this.hydrationAnimationTimeout = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hydrationService = HydrationService.getInstance();

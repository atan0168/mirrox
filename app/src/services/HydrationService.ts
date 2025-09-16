import { useHydrationStore } from '../store/hydrationStore';
import { localStorageService } from './LocalStorageService';
import {
  calculateBaselineHydrationGoal,
  calculateHeatIndexCategory,
} from '../utils/hydrationUtils';

export class HydrationService {
  private static instance: HydrationService | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  static getInstance(): HydrationService {
    if (!HydrationService.instance) {
      HydrationService.instance = new HydrationService();
    }
    return HydrationService.instance;
  }

  private constructor() {}

  /**
   * Initialize the hydration service and set up daily sync
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.initializeDailyGoal();
    await this.checkForNewDay();
    this.startBasalFluidLossTracking();

    this.isInitialized = true;
    console.log('[HydrationService] Initialized successfully');
  }

  /**
   * Initialize or update the daily hydration goal based on user profile
   */
  async initializeDailyGoal(): Promise<void> {
    try {
      const userProfile = await localStorageService.getUserProfile();
      if (!userProfile?.weightKg) {
        console.log(
          '[HydrationService] No weight data available, using default goal'
        );
        return;
      }

      const baselineGoal = calculateBaselineHydrationGoal(userProfile.weightKg);

      // Update user profile with calculated baseline if not set
      if (!userProfile.hydrationBaselineMl) {
        userProfile.hydrationBaselineMl = baselineGoal;
        userProfile.hydrationGoalMl = baselineGoal;
        await localStorageService.saveUserProfile(userProfile);
      }

      // Set the goal in the store
      const { setDailyGoal } = useHydrationStore.getState();
      setDailyGoal(userProfile.hydrationGoalMl || baselineGoal);

      console.log(
        `[HydrationService] Daily goal set to ${userProfile.hydrationGoalMl || baselineGoal}mL`
      );
    } catch (error) {
      console.error(
        '[HydrationService] Failed to initialize daily goal:',
        error
      );
    }
  }

  /**
   * Check if it's a new day and reset hydration state accordingly
   */
  async checkForNewDay(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const { currentDay, resetForNewDay } = useHydrationStore.getState();

    if (currentDay !== today) {
      console.log(`[HydrationService] New day detected: ${today}`);

      // Try to get sleep data for overnight dehydration calculation
      let sleepDurationMinutes = 0;
      try {
        // This would integrate with your existing health data service
        // For now, we'll use a default value
        sleepDurationMinutes = 480; // Default 8 hours
      } catch (error) {
        console.warn(
          '[HydrationService] Could not get sleep data, using default'
        );
      }

      resetForNewDay(today, sleepDurationMinutes);

      // Recalculate goal for new day (in case climate conditions changed)
      await this.adjustGoalForCurrentClimate();
    }
  }

  /**
   * Adjust hydration goal based on current climate conditions
   */
  async adjustGoalForCurrentClimate(): Promise<void> {
    try {
      const userProfile = await localStorageService.getUserProfile();
      if (!userProfile?.location) {
        console.log(
          '[HydrationService] No location data for climate adjustment'
        );
        return;
      }

      // This would integrate with your weather service
      // For now, we'll use mock data
      const temperature = 25; // Celsius
      const humidity = 60; // %

      const heatIndexCategory = calculateHeatIndexCategory(
        temperature,
        humidity
      );
      const { adjustGoalForClimate } = useHydrationStore.getState();

      adjustGoalForClimate(heatIndexCategory);

      if (heatIndexCategory !== 'normal') {
        console.log(
          `[HydrationService] Adjusted goal for ${heatIndexCategory} heat conditions`
        );
      }
    } catch (error) {
      console.error(
        '[HydrationService] Failed to adjust goal for climate:',
        error
      );
    }
  }

  /**
   * Start tracking basal fluid loss
   */
  private startBasalFluidLossTracking(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Process basal fluid loss every 30 minutes
    this.syncInterval = setInterval(
      () => {
        const { processBasalFluidLoss } = useHydrationStore.getState();
        processBasalFluidLoss();
      },
      30 * 60 * 1000
    ); // 30 minutes
  }

  /**
   * Process physical activity and deduct fluid loss
   */
  async processPhysicalActivity(activityData: {
    type: string;
    durationMinutes: number;
    intensity: 'low' | 'moderate' | 'high' | 'very_high';
    startTime?: string;
  }): Promise<void> {
    try {
      const { processActivityDeduction } = useHydrationStore.getState();
      processActivityDeduction(activityData);

      console.log(
        `[HydrationService] Processed ${activityData.type} activity: ${activityData.durationMinutes}min at ${activityData.intensity} intensity`
      );
    } catch (error) {
      console.error('[HydrationService] Failed to process activity:', error);
    }
  }

  /**
   * Log fluid intake
   */
  logFluidIntake(amountMl: number, fluidType?: string): void {
    try {
      const { logFluidIntake } = useHydrationStore.getState();
      logFluidIntake(amountMl);

      console.log(
        `[HydrationService] Logged ${amountMl}mL of ${fluidType || 'fluid'} intake`
      );
    } catch (error) {
      console.error('[HydrationService] Failed to log fluid intake:', error);
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

      let shouldRecalculateGoal = false;

      if (preferences.weightKg !== undefined) {
        userProfile.weightKg = preferences.weightKg;
        const newBaseline = calculateBaselineHydrationGoal(
          preferences.weightKg
        );
        userProfile.hydrationBaselineMl = newBaseline;
        shouldRecalculateGoal = true;
      }

      if (preferences.customGoalMl !== undefined) {
        userProfile.hydrationGoalMl = preferences.customGoalMl;
        const { setDailyGoal } = useHydrationStore.getState();
        setDailyGoal(preferences.customGoalMl);
      } else if (shouldRecalculateGoal) {
        userProfile.hydrationGoalMl = userProfile.hydrationBaselineMl;
        const { setDailyGoal } = useHydrationStore.getState();
        setDailyGoal(userProfile.hydrationBaselineMl!);
      }

      await localStorageService.saveUserProfile(userProfile);
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
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const hydrationService = HydrationService.getInstance();

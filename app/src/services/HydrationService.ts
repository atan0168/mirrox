import { useHydrationStore } from '../store/hydrationStore';
import { localStorageService } from './LocalStorageService';
import { apiService } from './ApiService';
import { healthDataService } from './HealthDataService';
import { getDeviceTimeZone, yyyymmddInTimeZone } from '../utils/datetimeUtils';
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

    // Immediately process basal fluid loss once on initialization
    try {
      const { processBasalFluidLoss } = useHydrationStore.getState();
      processBasalFluidLoss();
    } catch (e) {
      console.warn(
        '[HydrationService] Initial basal fluid loss processing failed:',
        e
      );
    }

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
    const state = useHydrationStore.getState();
    const { currentDay, resetForNewDay, processNightlyDehydration } = state;

    // Helper to obtain sleep minutes from health data
    const getSleepMinutes = async (): Promise<number> => {
      try {
        const now = new Date();
        const tz = getDeviceTimeZone();
        const todayStr = yyyymmddInTimeZone(now, tz);

        let snapshot = await healthDataService.getLatest();
        if (!snapshot || snapshot.date !== todayStr) {
          // Ensure we have today's snapshot
          snapshot = await healthDataService.syncLatest(now);
        }
        const minutes = snapshot?.sleepMinutes ?? 0;
        return Math.max(0, Math.round(minutes));
      } catch (error) {
        console.warn(
          '[HydrationService] Could not get sleep data from health service',
          error
        );
        return 0;
      }
    };

    if (currentDay !== today) {
      console.log(`[HydrationService] New day detected: ${today}`);
      const sleepDurationMinutes = await getSleepMinutes();

      resetForNewDay(today, sleepDurationMinutes);

      // After applying overnight dehydration, set basal tracking start to wake time to avoid double-counting sleep hours
      try {
        const wakeTime = new Date();
        wakeTime.setHours(0, 0, 0, 0);
        wakeTime.setMinutes(wakeTime.getMinutes() + sleepDurationMinutes);
        useHydrationStore.setState({ lastBasalUpdate: wakeTime.toISOString() });
      } catch (e) {
        console.warn(
          '[HydrationService] Failed to set wake-time basal start:',
          e
        );
      }

      // Recalculate goal for new day (in case climate conditions changed)
      await this.adjustGoalForCurrentClimate();
      return;
    }

    // Same-day initialization path: if the store is freshly initialized for today and
    // nightly dehydration hasn't been applied yet, apply it once.
    try {
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const lastUpdate = state.lastBasalUpdate
        ? new Date(state.lastBasalUpdate)
        : dayStart;

      const isAtDayStart = lastUpdate.getTime() === dayStart.getTime();
      const isFreshState = state.currentHydrationMl === 0; // heuristic: nothing applied/logged yet

      if (isAtDayStart && isFreshState) {
        const sleepDurationMinutes = await getSleepMinutes();
        processNightlyDehydration(sleepDurationMinutes);
        // After applying overnight dehydration, set basal tracking start to wake time to avoid double-counting sleep hours
        try {
          const wakeTime = new Date();
          wakeTime.setHours(0, 0, 0, 0);
          wakeTime.setMinutes(wakeTime.getMinutes() + sleepDurationMinutes);
          useHydrationStore.setState({
            lastBasalUpdate: wakeTime.toISOString(),
          });
        } catch (e) {
          console.warn(
            '[HydrationService] Failed to set wake-time basal start (same-day):',
            e
          );
        }
        console.log(
          `[HydrationService] Applied nightly dehydration for today: ${sleepDurationMinutes} minutes`
        );
      }
    } catch (e) {
      console.warn(
        '[HydrationService] Failed to apply same-day nightly dehydration heuristic:',
        e
      );
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

      const { latitude, longitude } = userProfile.location;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        console.warn(
          '[HydrationService] Invalid location coordinates for climate adjustment'
        );
        return;
      }

      let temperature: number | null = null;
      let humidity: number | null = null;

      try {
        const airQuality = await apiService.fetchAQICNAirQuality(
          latitude,
          longitude
        );
        temperature = airQuality.temperature ?? null;
        humidity = airQuality.humidity ?? null;

        if (temperature == null || humidity == null) {
          console.log(
            '[HydrationService] AQICN response missing temperature or humidity, using defaults'
          );
        }
      } catch (apiError) {
        console.warn(
          '[HydrationService] Failed to retrieve climate data from AQICN, using defaults',
          apiError
        );
      }

      if (temperature == null || humidity == null) {
        temperature = 25;
        humidity = 60;
      }

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

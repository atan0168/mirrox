/**
 * Health Metrics Service
 *
 * Centralized service for calculating and managing health metrics for the digital twin.
 * Integrates environmental data, user lifestyle data, and real-time factors.
 *
 * This service supports Epic 1 (Digital Twin Genesis) and Epic 2 (Living Environment Engine)
 * by providing real-time health calculations that respond to environmental changes.
 */

import {
  calculateHealthMetrics,
  EnvironmentalFactors,
  LifestyleFactors,
  HealthMetrics,
} from '../utils/healthMetrics';
import { AirQualityData } from '../models/AirQuality';
import { UserProfile } from '../models/User';
import { CongestionData } from './TrafficService';
import { encryptedDatabaseService } from './EncryptedDatabaseService';
import { HealthAlert } from '../models/HealthAlert';

export interface HealthMetricsInput {
  userProfile?: UserProfile;
  airQuality?: AirQualityData;
  trafficData?: CongestionData;
  currentTime?: Date;
  userInputs?: {
    sleepHours?: number;
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
    workHours?: number;
    exerciseMinutes?: number;
    stressLevel?: 'none' | 'mild' | 'moderate' | 'high';
  };
}

export interface HealthTrend {
  metric: keyof HealthMetrics;
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
  timeframe: string;
}

class HealthMetricsService {
  private activeAlerts: HealthAlert[] = [];
  private lastHistoryEntry: { timestamp: Date; metrics: HealthMetrics } | null =
    null;
  private initialized = false;

  private async ensureInitialized() {
    if (this.initialized) return;
    try {
      const latest = await encryptedDatabaseService.getLatestEntry();
      if (latest) {
        this.lastHistoryEntry = {
          timestamp: new Date(latest.timestamp),
          metrics: latest.metrics,
        };
      }
      // Load active alerts from DB on cold start
      const dbAlerts = await encryptedDatabaseService.getActiveAlerts();
      this.activeAlerts = dbAlerts;
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Calculate current health metrics from all available data sources
   */
  async calculateCurrentHealth(
    input: HealthMetricsInput
  ): Promise<HealthMetrics> {
    await this.ensureInitialized();
    const environmental = this.extractEnvironmentalFactors(input);
    const lifestyle = this.extractLifestyleFactors(input);

    const metrics = calculateHealthMetrics(environmental, lifestyle);

    // Store in history for trend analysis (only if significant change or hourly interval)
    const shouldStoreHistory = this.shouldStoreInHistory(
      metrics,
      input.currentTime || new Date()
    );
    if (shouldStoreHistory) {
      const ts = input.currentTime || new Date();
      await encryptedDatabaseService.addHistoryEntry(ts, metrics);
      this.lastHistoryEntry = { timestamp: ts, metrics };

      // Prune older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      encryptedDatabaseService.pruneHistory(thirtyDaysAgo).catch(() => {});
    }

    // Generate alerts based on current metrics
    await this.generateHealthAlerts(metrics, environmental, lifestyle);

    // Persist history (no-op)

    return metrics;
  }

  /**
   * Extract environmental factors from data sources
   */
  private extractEnvironmentalFactors(
    input: HealthMetricsInput
  ): EnvironmentalFactors {
    const environmental: EnvironmentalFactors = {};

    if (input.airQuality) {
      environmental.aqi = input.airQuality.aqi || null;
      environmental.pm25 = input.airQuality.pm25 || null;
      environmental.pm10 = input.airQuality.pm10 || null;
      environmental.no2 = input.airQuality.no2 || null;
      environmental.o3 = input.airQuality.o3 || null;
      environmental.uvIndex = input.airQuality.uvIndex || null;
    }

    return environmental;
  }

  /**
   * Extract lifestyle factors from user data
   */
  private extractLifestyleFactors(input: HealthMetricsInput): LifestyleFactors {
    const lifestyle: LifestyleFactors = {};

    if (input.userProfile) {
      lifestyle.commuteMode = input.userProfile.commuteMode;
      lifestyle.sleepHours = input.userProfile.sleepHours;
    }

    if (input.userInputs) {
      lifestyle.sleepHours =
        input.userInputs.sleepHours ?? lifestyle.sleepHours;
      lifestyle.sleepQuality = input.userInputs.sleepQuality;
      lifestyle.workHours = input.userInputs.workHours;
      lifestyle.exerciseMinutes = input.userInputs.exerciseMinutes;
      lifestyle.stressLevel = input.userInputs.stressLevel;
    }

    // Extract stress level from traffic data
    if (input.trafficData && !lifestyle.stressLevel) {
      lifestyle.stressLevel = input.trafficData.stressLevel;
    }

    // Estimate commute duration based on traffic data
    if (input.trafficData && input.userProfile?.commuteMode !== 'wfh') {
      // Rough estimation: assume 30-minute base commute affected by congestion
      const baseDuration = 30;
      lifestyle.commuteDuration = Math.round(
        baseDuration * input.trafficData.congestionFactor
      );
    }

    return lifestyle;
  }

  /**
   * Generate health alerts based on current metrics and conditions
   */
  private async generateHealthAlerts(
    metrics: HealthMetrics,
    environmental: EnvironmentalFactors,
    lifestyle: LifestyleFactors
  ) {
    const newAlerts: HealthAlert[] = [];
    const now = new Date();

    // Helper to check persisted alert-state for suppression and last condition
    const shouldPersistedCreate = async (
      alertKey: string,
      currentValue: number
    ): Promise<boolean> => {
      const st = await encryptedDatabaseService.getAlertState(alertKey);
      const nowMs = Date.now();
      if (st?.dismissedUntil && nowMs < st.dismissedUntil) return false;
      if (
        st?.lastConditionValue != null &&
        Math.abs(currentValue - st.lastConditionValue) < 5
      )
        return false;
      return true;
    };

    // Critical air quality alert
    const persistAlert = async (a: HealthAlert, currentValue: number) => {
      await encryptedDatabaseService.upsertAlert(a);
      await encryptedDatabaseService.setAlertState(a.id, {
        lastShownAt: a.timestamp.getTime(),
        lastConditionValue: currentValue,
      });
    };

    if (environmental.pm25 && environmental.pm25 > 55) {
      const alertKey = 'air-quality-critical';

      if (await shouldPersistedCreate(alertKey, environmental.pm25)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'critical',
          metric: 'lungHealth',
          message: 'Very unhealthy air quality detected',
          recommendation:
            'Stay indoors, use air purifier, wear N95 mask if going outside',
          severity: 9,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, environmental.pm25);
      }
    } else if (environmental.pm25 && environmental.pm25 > 35) {
      const alertKey = 'air-quality-warning';

      if (await shouldPersistedCreate(alertKey, environmental.pm25)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'warning',
          metric: 'lungHealth',
          message: 'Unhealthy air quality for sensitive groups',
          recommendation: 'Limit outdoor activities, consider wearing a mask',
          severity: 6,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, environmental.pm25);
      }
    }

    // High UV alert
    if (environmental.uvIndex && environmental.uvIndex > 7) {
      const alertKey = 'uv-warning';

      if (await shouldPersistedCreate(alertKey, environmental.uvIndex)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'warning',
          metric: 'skinHealth',
          message: 'Very high UV index detected',
          recommendation:
            'Use SPF 30+ sunscreen, wear protective clothing, seek shade',
          severity: 5,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, environmental.uvIndex);
      }
    }

    // Sleep deprivation alert
    if (lifestyle.sleepHours && lifestyle.sleepHours < 6) {
      const alertKey = 'sleep-warning';

      if (await shouldPersistedCreate(alertKey, lifestyle.sleepHours)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'warning',
          metric: 'energy',
          message: 'Insufficient sleep detected',
          recommendation:
            'Aim for 7-9 hours of sleep tonight for better health',
          severity: 7,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, lifestyle.sleepHours);
      }
    }

    // High stress alert
    if (metrics.stressIndex > 70) {
      const alertKey = 'stress-warning';

      if (await shouldPersistedCreate(alertKey, metrics.stressIndex)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'warning',
          metric: 'stressIndex',
          message: 'High stress levels detected',
          recommendation:
            'Take breaks, practice deep breathing, consider reducing workload',
          severity: 6,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, metrics.stressIndex);
      }
    }

    // Low overall health alert
    if (metrics.overallHealth < 40) {
      const alertKey = 'overall-critical';

      if (await shouldPersistedCreate(alertKey, metrics.overallHealth)) {
        const a: HealthAlert = {
          id: alertKey,
          type: 'critical',
          metric: 'overallHealth',
          message: 'Multiple health factors need attention',
          recommendation:
            'Focus on sleep, reduce pollution exposure, manage stress',
          severity: 8,
          timestamp: now,
        };
        newAlerts.push(a);
        await persistAlert(a, metrics.overallHealth);
      }
    }

    // Add new alerts and remove duplicates
    this.activeAlerts = [...this.activeAlerts, ...newAlerts];
    this.deduplicateAlerts();
  }

  /**
   * Remove duplicate alerts and old alerts
   */
  private deduplicateAlerts() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Remove old alerts but keep dismissed ones for a while to prevent recreation
    const alertMap = new Map<string, HealthAlert>();

    this.activeAlerts
      .filter(alert => {
        // Keep dismissed alerts for tracking but remove very old ones (24 hours)
        if (alert.dismissed) {
          const twentyFourHoursAgo = new Date();
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
          return alert.timestamp >= twentyFourHoursAgo;
        }
        // Keep active alerts from the last hour
        return alert.timestamp >= oneHourAgo;
      })
      .forEach(alert => {
        // Use alert ID as key since we now have stable IDs
        const existing = alertMap.get(alert.id);
        if (!existing || alert.timestamp > existing.timestamp) {
          alertMap.set(alert.id, alert);
        }
      });

    this.activeAlerts = Array.from(alertMap.values());
  }

  /**
   * Get health trends over time
   */
  getHealthTrends(timeframe: 'day' | 'week' | 'month' = 'week'): HealthTrend[] {
    if (!this.lastHistoryEntry) return [];

    const compareDate = new Date(this.lastHistoryEntry.timestamp);
    switch (timeframe) {
      case 'day':
        compareDate.setDate(compareDate.getDate() - 1);
        break;
      case 'week':
        compareDate.setDate(compareDate.getDate() - 7);
        break;
      case 'month':
        compareDate.setDate(compareDate.getDate() - 30);
        break;
    }

    const current = this.lastHistoryEntry;
    // Synchronously computed trends using the best-effort previous snapshot.
    // For tighter accuracy, we could make this async and query the DB.
    // To remain backward compatible with the hook's sync signature, we load lazily elsewhere when needed.

    // NOTE: We don't block here. If we need exact compare point, fetch synchronously cached value or default to current.
    // In a future refinement, we can cache the most recent compare point asynchronously.
    const previous = current; // Fallback to current if not loaded yet

    const metrics: (keyof HealthMetrics)[] = [
      'energy',
      'lungHealth',
      'skinHealth',
      'cognitiveFunction',
      'stressIndex',
      'overallHealth',
    ];

    const trends: HealthTrend[] = metrics.map(metric => {
      const currentValue = current.metrics[metric];
      const previousValue = previous.metrics[metric];
      const change = currentValue - previousValue;
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (Math.abs(change) > 2) {
        if (metric === 'stressIndex')
          trend = change < 0 ? 'improving' : 'declining';
        else trend = change > 0 ? 'improving' : 'declining';
      }
      return {
        metric,
        current: currentValue,
        previous: previousValue,
        change,
        trend,
        timeframe,
      };
    });

    return trends;
  }

  /**
   * Get health trends over time (DB-backed, accurate to timeframe)
   */
  async getHealthTrendsAsync(
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<HealthTrend[]> {
    await this.ensureInitialized();
    if (!this.lastHistoryEntry) return [];

    const compareDate = new Date(this.lastHistoryEntry.timestamp);
    switch (timeframe) {
      case 'day':
        compareDate.setDate(compareDate.getDate() - 1);
        break;
      case 'week':
        compareDate.setDate(compareDate.getDate() - 7);
        break;
      case 'month':
        compareDate.setDate(compareDate.getDate() - 30);
        break;
    }

    const current = this.lastHistoryEntry;
    const previousFromDb = await encryptedDatabaseService.getEntryAtOrBefore(
      compareDate
    );
    const previous = previousFromDb
      ? { timestamp: new Date(previousFromDb.timestamp), metrics: previousFromDb.metrics }
      : current; // Fallback if no historical snapshot

    const metrics: (keyof HealthMetrics)[] = [
      'energy',
      'lungHealth',
      'skinHealth',
      'cognitiveFunction',
      'stressIndex',
      'overallHealth',
    ];

    return metrics.map(metric => {
      const currentValue = current.metrics[metric];
      const previousValue = previous.metrics[metric];
      const change = currentValue - previousValue;
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (Math.abs(change) > 2) {
        if (metric === 'stressIndex') trend = change < 0 ? 'improving' : 'declining';
        else trend = change > 0 ? 'improving' : 'declining';
      }
      return {
        metric,
        current: currentValue,
        previous: previousValue,
        change,
        trend,
        timeframe,
      };
    });
  }

  /**
   * Get active health alerts
   */
  getActiveAlerts(): HealthAlert[] {
    // Return in-memory active alerts which mirror the DB writes in this session
    return this.activeAlerts.filter(alert => !alert.dismissed);
  }

  /**
   * Dismiss a health alert
   */
  async dismissAlert(alertId: string) {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      // Persist dismissal for 1 hour
      const dismissUntil = Date.now() + 60 * 60 * 1000;
      await encryptedDatabaseService.dismissAlert(alertId, dismissUntil);
    }
    // Remove from in-memory active list for immediate UI reflection
    this.activeAlerts = this.activeAlerts.filter(
      a => !a.id || a.id !== alertId || !a.dismissed
    );
  }

  /**
   * Check if we should store this health data in history
   * Only store if significant change or hourly interval
   */
  private shouldStoreInHistory(
    metrics: HealthMetrics,
    timestamp: Date
  ): boolean {
    if (!this.lastHistoryEntry) return true;

    const lastEntry = this.lastHistoryEntry;
    const timeDiff = timestamp.getTime() - lastEntry.timestamp.getTime();
    const oneHour = 60 * 60 * 1000;

    // Store if more than 1 hour has passed
    if (timeDiff >= oneHour) return true;

    // Store if significant change in any metric (>5 points)
    const significantChange = (
      Object.keys(metrics) as Array<keyof HealthMetrics>
    ).some(key => {
      const current = metrics[key];
      const previous = lastEntry.metrics[key];
      return Math.abs(current - previous) > 5;
    });

    return significantChange;
  }

  /**
   * Get health recommendations based on current conditions
   */
  getHealthRecommendations(input: HealthMetricsInput): string[] {
    const recommendations: string[] = [];
    const environmental = this.extractEnvironmentalFactors(input);
    const lifestyle = this.extractLifestyleFactors(input);

    // Air quality recommendations
    if (environmental.pm25 && environmental.pm25 > 25) {
      recommendations.push(
        'Consider wearing a mask outdoors due to poor air quality'
      );
      recommendations.push('Use an air purifier indoors if available');
    }

    // UV protection recommendations
    if (environmental.uvIndex && environmental.uvIndex > 5) {
      recommendations.push('Apply SPF 30+ sunscreen before going outside');
      recommendations.push('Wear sunglasses and protective clothing');
    }

    // Sleep recommendations
    if (lifestyle.sleepHours && lifestyle.sleepHours < 7) {
      recommendations.push('Aim for 7-9 hours of sleep for optimal health');
      recommendations.push('Establish a consistent bedtime routine');
    }

    // Stress management recommendations
    if (
      lifestyle.stressLevel === 'high' ||
      lifestyle.stressLevel === 'moderate'
    ) {
      recommendations.push('Take regular breaks during work');
      recommendations.push('Practice deep breathing or meditation');
    }

    // Exercise recommendations
    if (!lifestyle.exerciseMinutes || lifestyle.exerciseMinutes < 30) {
      recommendations.push(
        'Aim for at least 30 minutes of physical activity daily'
      );
    }

    // Commute recommendations
    if (
      lifestyle.commuteMode === 'car' &&
      environmental.pm25 &&
      environmental.pm25 > 15
    ) {
      recommendations.push(
        'Consider using public transport or working from home on high pollution days'
      );
    }

    return recommendations;
  }

  /**
   * Clear all health history (for testing or reset)
   */
  clearHistory() {
    // Clear persisted history and alerts, and reset in-memory caches
    encryptedDatabaseService
      .clearAll()
      .catch(() => {})
      .finally(() => {
        this.activeAlerts = [];
        this.lastHistoryEntry = null;
      });
  }
}

export const healthMetricsService = new HealthMetricsService();

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

export interface HealthAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: keyof HealthMetrics;
  message: string;
  recommendation?: string;
  severity: number; // 1-10
  timestamp: Date;
  dismissed?: boolean;
}

class HealthMetricsService {
  private healthHistory: Array<{ timestamp: Date; metrics: HealthMetrics }> =
    [];
  private activeAlerts: HealthAlert[] = [];

  /**
   * Calculate current health metrics from all available data sources
   */
  calculateCurrentHealth(input: HealthMetricsInput): HealthMetrics {
    const environmental = this.extractEnvironmentalFactors(input);
    const lifestyle = this.extractLifestyleFactors(input);

    const metrics = calculateHealthMetrics(environmental, lifestyle);

    // Store in history for trend analysis
    this.healthHistory.push({
      timestamp: input.currentTime || new Date(),
      metrics,
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.healthHistory = this.healthHistory.filter(
      entry => entry.timestamp >= thirtyDaysAgo
    );

    // Generate alerts based on current metrics
    this.generateHealthAlerts(metrics, environmental, lifestyle);

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
  private generateHealthAlerts(
    metrics: HealthMetrics,
    environmental: EnvironmentalFactors,
    lifestyle: LifestyleFactors
  ): void {
    const newAlerts: HealthAlert[] = [];

    // Critical air quality alert
    if (environmental.pm25 && environmental.pm25 > 55) {
      newAlerts.push({
        id: `air-quality-${Date.now()}`,
        type: 'critical',
        metric: 'lungHealth',
        message: 'Very unhealthy air quality detected',
        recommendation:
          'Stay indoors, use air purifier, wear N95 mask if going outside',
        severity: 9,
        timestamp: new Date(),
      });
    } else if (environmental.pm25 && environmental.pm25 > 35) {
      newAlerts.push({
        id: `air-quality-${Date.now()}`,
        type: 'warning',
        metric: 'lungHealth',
        message: 'Unhealthy air quality for sensitive groups',
        recommendation: 'Limit outdoor activities, consider wearing a mask',
        severity: 6,
        timestamp: new Date(),
      });
    }

    // High UV alert
    if (environmental.uvIndex && environmental.uvIndex > 7) {
      newAlerts.push({
        id: `uv-${Date.now()}`,
        type: 'warning',
        metric: 'skinHealth',
        message: 'Very high UV index detected',
        recommendation:
          'Use SPF 30+ sunscreen, wear protective clothing, seek shade',
        severity: 5,
        timestamp: new Date(),
      });
    }

    // Sleep deprivation alert
    if (lifestyle.sleepHours && lifestyle.sleepHours < 6) {
      newAlerts.push({
        id: `sleep-${Date.now()}`,
        type: 'warning',
        metric: 'energy',
        message: 'Insufficient sleep detected',
        recommendation: 'Aim for 7-9 hours of sleep tonight for better health',
        severity: 7,
        timestamp: new Date(),
      });
    }

    // High stress alert
    if (metrics.stressIndex > 70) {
      newAlerts.push({
        id: `stress-${Date.now()}`,
        type: 'warning',
        metric: 'stressIndex',
        message: 'High stress levels detected',
        recommendation:
          'Take breaks, practice deep breathing, consider reducing workload',
        severity: 6,
        timestamp: new Date(),
      });
    }

    // Low overall health alert
    if (metrics.overallHealth < 40) {
      newAlerts.push({
        id: `overall-${Date.now()}`,
        type: 'critical',
        metric: 'overallHealth',
        message: 'Multiple health factors need attention',
        recommendation:
          'Focus on sleep, reduce pollution exposure, manage stress',
        severity: 8,
        timestamp: new Date(),
      });
    }

    // Add new alerts and remove duplicates
    this.activeAlerts = [...this.activeAlerts, ...newAlerts];
    this.deduplicateAlerts();
  }

  /**
   * Remove duplicate alerts and old alerts
   */
  private deduplicateAlerts(): void {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Remove old alerts and keep only the latest of each type
    const alertMap = new Map<string, HealthAlert>();

    this.activeAlerts
      .filter(alert => alert.timestamp >= oneHourAgo && !alert.dismissed)
      .forEach(alert => {
        const key = `${alert.metric}-${alert.type}`;
        const existing = alertMap.get(key);
        if (!existing || alert.timestamp > existing.timestamp) {
          alertMap.set(key, alert);
        }
      });

    this.activeAlerts = Array.from(alertMap.values());
  }

  /**
   * Get health trends over time
   */
  getHealthTrends(timeframe: 'day' | 'week' | 'month' = 'week'): HealthTrend[] {
    if (this.healthHistory.length < 2) return [];

    const now = new Date();
    let compareDate = new Date();

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

    const current = this.healthHistory[this.healthHistory.length - 1];
    const previous =
      this.healthHistory
        .filter(entry => entry.timestamp >= compareDate)
        .find(entry => entry.timestamp <= compareDate) || this.healthHistory[0];

    const trends: HealthTrend[] = [];
    const metrics: (keyof HealthMetrics)[] = [
      'energy',
      'lungHealth',
      'skinHealth',
      'cognitiveFunction',
      'stressIndex',
      'overallHealth',
    ];

    metrics.forEach(metric => {
      const currentValue = current.metrics[metric];
      const previousValue = previous.metrics[metric];
      const change = currentValue - previousValue;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (Math.abs(change) > 2) {
        // Threshold for significant change
        if (metric === 'stressIndex') {
          trend = change < 0 ? 'improving' : 'declining'; // Lower stress is better
        } else {
          trend = change > 0 ? 'improving' : 'declining';
        }
      }

      trends.push({
        metric,
        current: currentValue,
        previous: previousValue,
        change,
        trend,
        timeframe,
      });
    });

    return trends;
  }

  /**
   * Get active health alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return this.activeAlerts.filter(alert => !alert.dismissed);
  }

  /**
   * Dismiss a health alert
   */
  dismissAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
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
  clearHistory(): void {
    this.healthHistory = [];
    this.activeAlerts = [];
  }
}

export const healthMetricsService = new HealthMetricsService();

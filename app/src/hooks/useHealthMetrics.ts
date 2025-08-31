/**
 * Health Metrics Hook
 *
 * React hook that provides real-time health metrics for the digital twin.
 * Integrates air quality, traffic data, and user profile to calculate comprehensive health scores.
 *
 * Supports Epic 1 (Digital Twin Genesis) and Epic 2 (Living Environment Engine)
 * by providing reactive health calculations that update with environmental changes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  healthMetricsService,
  HealthMetricsInput,
  HealthTrend,
  HealthAlert,
} from '../services/HealthMetricsService';
import { HealthMetrics } from '../utils/healthMetrics';
import { useAirQuality } from './useAirQuality';
import { useTrafficData } from './useTrafficData';
import { useUserProfile } from './useUserProfile';

export interface UseHealthMetricsProps {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
  userInputs?: {
    sleepHours?: number;
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
    workHours?: number;
    exerciseMinutes?: number;
    stressLevel?: 'none' | 'mild' | 'moderate' | 'high';
  };
}

export interface UseHealthMetricsReturn {
  // Current health metrics
  healthMetrics: HealthMetrics | null;

  // Loading states
  loading: boolean;
  error: Error | null;

  // Data freshness
  lastUpdated: Date | null;
  dataAge: number; // seconds since last update

  // Trends and history
  trends: HealthTrend[];

  // Alerts and recommendations
  alerts: HealthAlert[];
  recommendations: string[];

  // Actions
  refetch: () => void;
  dismissAlert: (alertId: string) => void;
  updateUserInputs: (inputs: UseHealthMetricsProps['userInputs']) => void;

  // Data source status
  dataSources: {
    airQuality: { available: boolean; lastUpdated: Date | null };
    traffic: { available: boolean; lastUpdated: Date | null };
    userProfile: { available: boolean; lastUpdated: Date | null };
  };
}

export const useHealthMetrics = ({
  enabled = true,
  refreshInterval = 300000, // 5 minutes default
  userInputs: initialUserInputs,
}: UseHealthMetricsProps = {}): UseHealthMetricsReturn => {
  const [userInputs, setUserInputs] = useState(initialUserInputs);
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null);

  // Get user profile
  const { data: userProfile } = useUserProfile();

  // Get air quality data
  const {
    data: airQualityData,
    isLoading: airQualityLoading,
    error: airQualityError,
  } = useAirQuality(
    userProfile?.location?.latitude as number,
    userProfile?.location?.longitude as number,
    enabled && !!userProfile?.location
  );

  // Get traffic data
  const {
    data: trafficData,
    loading: trafficLoading,
    error: trafficError,
  } = useTrafficData({
    latitude: userProfile?.location?.latitude,
    longitude: userProfile?.location?.longitude,
    enabled:
      enabled && !!userProfile?.location && userProfile?.commuteMode !== 'wfh',
  });

  // Calculate health metrics
  const healthMetricsQuery = useQuery({
    queryKey: [
      'healthMetrics',
      userProfile?.location?.latitude,
      userProfile?.location?.longitude,
      airQualityData?.timestamp,
      trafficData?.timestamp,
      userInputs,
      userProfile?.sleepHours,
      userProfile?.commuteMode,
    ],
    queryFn: async (): Promise<{
      metrics: HealthMetrics;
      trends: HealthTrend[];
      alerts: HealthAlert[];
      recommendations: string[];
    }> => {
      const input: HealthMetricsInput = {
        userProfile: userProfile || undefined,
        airQuality: airQualityData || undefined,
        trafficData: trafficData || undefined,
        currentTime: new Date(),
        userInputs,
      };

      console.log('🏥 Calculating health metrics with input:', {
        hasUserProfile: !!userProfile,
        hasAirQuality: !!airQualityData,
        hasTraffic: !!trafficData,
        userInputs,
      });

      const metrics = healthMetricsService.calculateCurrentHealth(input);
      const trends = healthMetricsService.getHealthTrends('week');
      const alerts = healthMetricsService.getActiveAlerts();
      const recommendations =
        healthMetricsService.getHealthRecommendations(input);

      console.log('🏥 Health metrics calculated:', {
        overallHealth: metrics.overallHealth,
        energy: metrics.energy,
        lungHealth: metrics.lungHealth,
        skinHealth: metrics.skinHealth,
        alertCount: alerts.length,
      });

      setLastCalculation(new Date());

      return { metrics, trends, alerts, recommendations };
    },
    enabled: enabled && !!userProfile,
    staleTime: refreshInterval,
    gcTime: refreshInterval * 2,
    refetchInterval: refreshInterval,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Calculate data age
  const dataAge = useMemo(() => {
    if (!lastCalculation) return 0;
    return Math.floor((Date.now() - lastCalculation.getTime()) / 1000);
  }, [lastCalculation]);

  // Determine overall loading state
  const loading = useMemo(() => {
    return (
      healthMetricsQuery.isLoading ||
      (enabled &&
        !!userProfile?.location &&
        (airQualityLoading || trafficLoading))
    );
  }, [
    healthMetricsQuery.isLoading,
    enabled,
    userProfile?.location,
    airQualityLoading,
    trafficLoading,
  ]);

  // Determine overall error state
  const error = useMemo(() => {
    return healthMetricsQuery.error || airQualityError || trafficError;
  }, [healthMetricsQuery.error, airQualityError, trafficError]);

  // Data sources status
  const dataSources = useMemo(
    () => ({
      airQuality: {
        available: !!airQualityData && !airQualityError,
        lastUpdated: airQualityData?.timestamp
          ? new Date(airQualityData.timestamp)
          : null,
      },
      traffic: {
        available: !!trafficData && !trafficError,
        lastUpdated: trafficData?.timestamp
          ? new Date(trafficData.timestamp)
          : null,
      },
      userProfile: {
        available: !!userProfile,
        lastUpdated: userProfile ? new Date() : null, // Assuming profile is always current
      },
    }),
    [airQualityData, airQualityError, trafficData, trafficError, userProfile]
  );

  // Update user inputs function
  const updateUserInputs = (newInputs: UseHealthMetricsProps['userInputs']) => {
    setUserInputs(prev => ({ ...prev, ...newInputs }));
  };

  // Dismiss alert function
  const dismissAlert = (alertId: string) => {
    healthMetricsService.dismissAlert(alertId);
    healthMetricsQuery.refetch(); // Refresh to update alerts
  };

  // Log health metrics changes
  useEffect(() => {
    if (healthMetricsQuery.data?.metrics) {
      const metrics = healthMetricsQuery.data.metrics;

      // Log significant health changes
      if (metrics.overallHealth < 50) {
        console.warn('⚠️ Low overall health detected:', metrics.overallHealth);
      }

      if (metrics.lungHealth < 60) {
        console.warn('🫁 Poor lung health detected:', metrics.lungHealth);
      }

      if (metrics.stressIndex > 70) {
        console.warn('😰 High stress levels detected:', metrics.stressIndex);
      }
    }
  }, [healthMetricsQuery.data?.metrics]);

  // Log alerts
  useEffect(() => {
    if (
      healthMetricsQuery.data?.alerts &&
      healthMetricsQuery.data.alerts.length > 0
    ) {
      console.log(
        '🚨 Active health alerts:',
        healthMetricsQuery.data.alerts.map(a => a.message)
      );
    }
  }, [healthMetricsQuery.data?.alerts]);

  return {
    healthMetrics: healthMetricsQuery.data?.metrics || null,
    loading,
    error,
    lastUpdated: lastCalculation,
    dataAge,
    trends: healthMetricsQuery.data?.trends || [],
    alerts: healthMetricsQuery.data?.alerts || [],
    recommendations: healthMetricsQuery.data?.recommendations || [],
    refetch: healthMetricsQuery.refetch,
    dismissAlert,
    updateUserInputs,
    dataSources,
  };
};

/**
 * Hook for getting health metrics with simplified interface (backward compatibility)
 */
export const useSimpleHealthMetrics = (
  sleep?: number,
  aqi?: number,
  commute?: string
): {
  energy: number;
  lungHealth: number;
  skinGlow: number;
  overallHealth: number;
} => {
  const { healthMetrics } = useHealthMetrics({
    userInputs: {
      sleepHours: sleep,
    },
  });

  return {
    energy: healthMetrics?.energy || 50,
    lungHealth: healthMetrics?.lungHealth || 60,
    skinGlow: healthMetrics?.skinHealth || 50,
    overallHealth: healthMetrics?.overallHealth || 50,
  };
};

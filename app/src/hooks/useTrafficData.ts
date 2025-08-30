import { useState, useEffect, useCallback } from 'react';
import { trafficService, CongestionData } from '../services/TrafficService';

interface UseTrafficDataProps {
  latitude?: number;
  longitude?: number;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseTrafficDataReturn {
  data: CongestionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useTrafficData = ({
  latitude,
  longitude,
  enabled = true,
  refreshInterval = 300000, // 5 minutes default
}: UseTrafficDataProps): UseTrafficDataReturn => {
  const [data, setData] = useState<CongestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTrafficData = useCallback(async () => {
    if (!latitude || !longitude || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🚗 Fetching traffic data for ${latitude}, ${longitude}`);
      const result = await trafficService.getCongestionFactor(latitude, longitude);
      setData(result);
      setLastUpdated(new Date());
      
      // Log stress level changes
      if (result.stressLevel !== 'none') {
        console.log(`🚨 Traffic stress detected: ${result.stressLevel} (factor: ${result.congestionFactor})`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Traffic data fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, enabled]);

  // Initial fetch and setup refresh interval
  useEffect(() => {
    if (!enabled || !latitude || !longitude) {
      return;
    }

    // Fetch immediately
    fetchTrafficData();

    // Set up refresh interval
    const interval = setInterval(fetchTrafficData, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchTrafficData, refreshInterval, enabled, latitude, longitude]);

  return {
    data,
    loading,
    error,
    refetch: fetchTrafficData,
    lastUpdated,
  };
};
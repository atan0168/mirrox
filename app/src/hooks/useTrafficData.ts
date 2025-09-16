import { useQuery } from '@tanstack/react-query';
import { trafficService, CongestionData } from '../services/TrafficService';
import { localStorageService } from '../services/LocalStorageService';
import { ENV_REFRESH_INTERVAL_MS } from '../constants';

interface UseTrafficDataProps {
  latitude?: number;
  longitude?: number;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseTrafficDataReturn {
  data: CongestionData | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

export const useTrafficData = ({
  latitude,
  longitude,
  enabled = true,
  refreshInterval = ENV_REFRESH_INTERVAL_MS,
}: UseTrafficDataProps): UseTrafficDataReturn => {
  const query = useQuery<CongestionData, Error>({
    queryKey: ['trafficData', latitude, longitude],
    queryFn: async () => {
      if (!latitude || !longitude) {
        throw new Error('Latitude and longitude are required');
      }

      console.log(`🚗 Fetching traffic data for ${latitude}, ${longitude}`);
      const result = await trafficService.getCongestionFactor(
        latitude,
        longitude
      );

      return result;
    },
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess: async () => {
      if (latitude && longitude) {
        try {
          await localStorageService.setLastEnvironmentalQuery({
            latitude,
            longitude,
            timestamp: Date.now(),
          });
        } catch {}
      }
    },
  });

  // Handle error logging when error changes
  if (query.error) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    console.error('Traffic data fetch error:', query.error.message);
    console.log(`Error message displayed in ${responseTime}ms`);
  }

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
};

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiService } from '../services/ApiService';
import {
  backendApiService,
  StationSearchResult,
} from '../services/BackendApiService';
import { localStorageService } from '../services/LocalStorageService';

export const useAirQuality = (
  latitude: number,
  longitude: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['airQuality', latitude, longitude],
    queryFn: () => apiService.fetchAirQuality(latitude, longitude),
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useAQICNAirQuality = (
  latitude: number,
  longitude: number,
  enabled: boolean = true,
  refreshInterval?: number
) => {
  const query = useQuery({
    queryKey: ['aqicnAirQuality', latitude, longitude],
    queryFn: () => apiService.fetchAQICNAirQuality(latitude, longitude),
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 30 * 60 * 1000, // 30 minutes (AQICN updates hourly)
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (query.isSuccess) {
      (async () => {
        try {
          await localStorageService.setLastEnvironmentalQuery({
            latitude,
            longitude,
            timestamp: Date.now(),
          });
        } catch (e) {
          // non-fatal
        }
      })();
    }
  }, [query.isSuccess, latitude, longitude]);

  return query;
};

export const useAQICNStationData = (
  stationId: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['aqicnStation', stationId],
    queryFn: () => apiService.fetchAQICNStationData(stationId),
    enabled: enabled && !!stationId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useAQICNStationSearch = (
  latitude: number,
  longitude: number,
  radius?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['aqicnStationSearch', latitude, longitude, radius],
    queryFn: async (): Promise<StationSearchResult[]> => {
      const response = await backendApiService.searchAQICNStations(
        latitude,
        longitude,
        radius
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search AQICN stations');
      }
      return response.data;
    },
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 60 * 60 * 1000, // 1 hour (station locations don't change often)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
  });
};

export const useBackendHealth = () => {
  return useQuery({
    queryKey: ['backendHealth'],
    queryFn: () => apiService.checkBackendHealth(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry health checks
  });
};

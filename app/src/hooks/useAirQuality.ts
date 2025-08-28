import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/ApiService";
import { AirQualityData } from "../models/AirQuality";

export const useAirQuality = (
  latitude: number,
  longitude: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["airQuality", latitude, longitude],
    queryFn: () => apiService.fetchAirQuality(latitude, longitude),
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useBackendHealth = () => {
  return useQuery({
    queryKey: ["backendHealth"],
    queryFn: () => apiService.checkBackendHealth(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry health checks
  });
};

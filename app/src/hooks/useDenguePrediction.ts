import { useQuery } from '@tanstack/react-query';
import { useReverseGeocode } from './useReverseGeocode';
import {
  backendApiService,
  DenguePredictResponse,
} from '../services/BackendApiService';

export interface UseDenguePredictionOptions {
  latitude?: number;
  longitude?: number;
  enabled?: boolean;
  live?: boolean; // default true
}

export const useDenguePrediction = ({
  latitude,
  longitude,
  enabled = true,
  live = true,
}: UseDenguePredictionOptions) => {
  // First, reverse geocode to get the region/state
  const { data: reverseGeo } = useReverseGeocode(latitude, longitude, enabled);

  const state = reverseGeo?.region || reverseGeo?.city || undefined;
  const isMY =
    reverseGeo?.countryCode === 'MY' || reverseGeo?.country === 'Malaysia';

  return useQuery<{
    success: boolean;
    data?: DenguePredictResponse;
    error?: string;
  }>({
    queryKey: ['denguePredict', state, live],
    enabled: enabled && !!state && isMY,
    queryFn: async () => {
      // pass state as-is; backend/Python handle casing and aliases
      return backendApiService.fetchDenguePrediction(state as string, { live });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
};

import { useQuery } from '@tanstack/react-query';
import {
  backendApiService,
  ArcGISResponse,
  StateAttributes,
} from '../services/BackendApiService';

interface UseDengueStateStatsOptions {
  enabled?: boolean;
}

export const useDengueStateStats = (
  options: UseDengueStateStatsOptions = {}
) => {
  const { enabled = true } = options;

  return useQuery<ArcGISResponse<StateAttributes>>({
    queryKey: ['dengueStateStats'],
    enabled,
    queryFn: () => backendApiService.fetchDengueStateStats(),
    staleTime: 1 * 60 * 60 * 1000, // 1 hours
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 1,
  });
};

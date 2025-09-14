import { useQuery } from '@tanstack/react-query';
import { useReverseGeocode } from './useReverseGeocode';
import {
  backendApiService,
  ArcGISResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
} from '../services/BackendApiService';

export interface UseDengueNearbyOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // default 10
  enabled?: boolean;
}

export interface DengueNearbyResult {
  hotspots?: ArcGISResponse<HotspotAttributes, PointGeometry>;
  outbreaks?: ArcGISResponse<OutbreakAttributes, PolygonGeometry>;
  hotspotCount: number;
  outbreakCount: number;
}

export const useDengueNearby = ({
  latitude,
  longitude,
  radiusKm = 10,
  enabled = true,
}: UseDengueNearbyOptions) => {
  const { data: reverseGeo } = useReverseGeocode(latitude, longitude, enabled);
  const isMY =
    reverseGeo?.countryCode === 'MY' || reverseGeo?.country === 'Malaysia';

  return useQuery<DengueNearbyResult>({
    queryKey: ['dengueNearby', latitude, longitude, radiusKm],
    enabled: enabled && !!latitude && !!longitude && !!isMY,
    queryFn: async () => {
      if (latitude == null || longitude == null)
        throw new Error('Missing coordinates');
      const [hotspots, outbreaks] = await Promise.all([
        backendApiService.fetchDengueHotspots(latitude, longitude, radiusKm),
        backendApiService.fetchDengueOutbreaks(latitude, longitude, radiusKm),
      ]);
      return {
        hotspots,
        outbreaks,
        hotspotCount: hotspots?.features?.length ?? 0,
        outbreakCount: outbreaks?.features?.length ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
};

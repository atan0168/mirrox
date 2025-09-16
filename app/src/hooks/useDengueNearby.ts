import { useQuery } from '@tanstack/react-query';
import { useReverseGeocode } from './useReverseGeocode';
import {
  backendApiService,
  ArcGISFeature,
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

const dedupeHotspotsByLocality = (
  hotspots?: ArcGISResponse<HotspotAttributes, PointGeometry>
): ArcGISResponse<HotspotAttributes, PointGeometry> | undefined => {
  const features = hotspots?.features;
  if (!features?.length || !hotspots) return hotspots;

  const deduped = new Map<
    string,
    ArcGISFeature<HotspotAttributes, PointGeometry>
  >();

  for (const feature of features) {
    const locality = feature.attributes['SPWD.DBO_LOKALITI_POINTS.LOKALITI'];
    const geometry = feature.geometry;
    // don't include if no location
    if (!locality || !geometry) continue;
    const x = geometry.x;
    const y = geometry.y;
    const key = `${locality}|${x}|${y}`;

    const current = deduped.get(key);
    const currentDuration =
      current?.attributes['SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK'] ?? -Infinity;
    const candidateDuration =
      feature.attributes['SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK'] ?? -Infinity;

    if (!current || candidateDuration >= currentDuration) {
      deduped.set(key, feature);
    }
  }

  return {
    ...hotspots,
    features: Array.from(deduped.values()),
  };
};

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
      const [hotspotsRaw, outbreaks] = await Promise.all([
        backendApiService.fetchDengueHotspots(latitude, longitude, radiusKm),
        backendApiService.fetchDengueOutbreaks(latitude, longitude, radiusKm),
      ]);
      const hotspots = dedupeHotspotsByLocality(hotspotsRaw);
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

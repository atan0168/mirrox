import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { localStorageService } from '../services/LocalStorageService';
import { REVERSE_GEOCODE_ROUNDING_DECIMALS } from '../constants';

export interface ReverseGeocodeResult {
  city?: string | null;
  region?: string | null; // state/province
  country?: string | null;
  countryCode?: string | null;
  label: string; // e.g., "City, State"
}

const roundCoord = (n: number, precision = REVERSE_GEOCODE_ROUNDING_DECIMALS) =>
  Math.round(n * 10 ** precision) / 10 ** precision;

export const useReverseGeocode = (
  latitude?: number,
  longitude?: number,
  enabled: boolean = true
) => {
  const lat = latitude != null ? roundCoord(latitude) : undefined;
  const lng = longitude != null ? roundCoord(longitude) : undefined;

  return useQuery<ReverseGeocodeResult>({
    queryKey: ['reverseGeocode', lat, lng],
    enabled: enabled && !!lat && !!lng,
    queryFn: async () => {
      if (lat == null || lng == null) throw new Error('Missing coordinates');
      const cacheKey = `${lat.toFixed(REVERSE_GEOCODE_ROUNDING_DECIMALS)},${lng.toFixed(REVERSE_GEOCODE_ROUNDING_DECIMALS)}`;

      // Check persistent cache first
      const cached =
        await localStorageService.getCachedReverseGeocode(cacheKey);
      if (cached) {
        return cached;
      }

      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      const addr = results?.[0];
      if (!addr) {
        const fallback = { label: `${lat}, ${lng}` } as ReverseGeocodeResult;
        await localStorageService.setCachedReverseGeocode(cacheKey, fallback);
        return fallback;
      }

      const city = addr.city || addr.subregion || addr.district || addr.name;
      const region = addr.region || addr.subregion;
      const country = addr.country ?? null;
      const countryCode = addr.isoCountryCode ?? null;

      const cityPart = city ?? undefined;
      const regionPart = region ?? undefined;
      const label =
        [cityPart, regionPart].filter(Boolean).join(', ') ||
        [cityPart, countryCode ?? country].filter(Boolean).join(', ') ||
        `${lat}, ${lng}`;

      const result: ReverseGeocodeResult = {
        city,
        region,
        country,
        countryCode,
        label,
      };

      await localStorageService.setCachedReverseGeocode(cacheKey, {
        ...result,
        ts: Date.now(),
      });
      return result;
    },
    // Keep in memory moderately fresh; persistent cache prevents repeated lookups
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};

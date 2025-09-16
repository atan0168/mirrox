import Constants from 'expo-constants';
import { localStorageService } from './LocalStorageService';
import { REVERSE_GEOCODE_ROUNDING_DECIMALS } from '../constants';
import { UserLocationDetails } from '../models/User';

interface LocationIQReverseResponse {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    hamlet?: string;
    neighbourhood?: string;
    state?: string;
    region?: string;
    county?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

const BASE_URL = 'https://us1.locationiq.com/v1';

const normalizeCoordinate = (value: number) =>
  Number.parseFloat(value.toFixed(REVERSE_GEOCODE_ROUNDING_DECIMALS));

const createCacheKey = (latitude: number, longitude: number) =>
  `${normalizeCoordinate(latitude).toFixed(
    REVERSE_GEOCODE_ROUNDING_DECIMALS
  )},${normalizeCoordinate(longitude).toFixed(
    REVERSE_GEOCODE_ROUNDING_DECIMALS
  )}`;

const resolveApiKey = (): string | null => {
  const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra;
  const key = (extra?.LOCATIONIQ_API_KEY ?? extra?.locationIqApiKey ?? null) as
    | string
    | null;
  return key && key.trim().length > 0 ? key : null;
};

const pickCity = (address: LocationIQReverseResponse['address']) => {
  if (!address) return null;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    address.hamlet ||
    address.neighbourhood ||
    null
  );
};

const pickRegion = (address: LocationIQReverseResponse['address']) => {
  if (!address) return null;
  return address.state || address.region || address.county || null;
};

export class LocationIQService {
  public async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<UserLocationDetails> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    const cacheKey = createCacheKey(latitude, longitude);
    const cached = await localStorageService.getCachedReverseGeocode(cacheKey);
    if (cached) {
      return {
        coordinates: { latitude, longitude },
        label: cached.label,
        address: cached.label,
        city: cached.city ?? null,
        state: cached.region ?? null,
        country: cached.country ?? null,
        countryCode: cached.countryCode ?? null,
      };
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      throw new Error(
        'LocationIQ API key is not configured. Please set LOCATIONIQ_API_KEY in expo.extra.'
      );
    }

    const params = new URLSearchParams({
      key: apiKey,
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
      normalizeaddress: '1',
      addressdetails: '1',
    });

    const response = await fetch(`${BASE_URL}/reverse?${params.toString()}`);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `LocationIQ reverse geocode failed (${response.status}): ${body}`
      );
    }

    const data = (await response.json()) as LocationIQReverseResponse;

    const label = data.display_name?.trim() || `${latitude}, ${longitude}`;
    const city = pickCity(data.address);
    const state = pickRegion(data.address);
    const country = data.address?.country ?? null;
    const countryCode = data.address?.country_code
      ? data.address.country_code.toUpperCase()
      : null;
    const postcode = data.address?.postcode ?? null;

    await localStorageService.setCachedReverseGeocode(cacheKey, {
      label,
      city,
      region: state,
      country,
      countryCode,
      ts: Date.now(),
    });

    return {
      coordinates: { latitude, longitude },
      label,
      address: label,
      city,
      state,
      country,
      countryCode,
      postcode,
    };
  }
}

export const locationIQService = new LocationIQService();

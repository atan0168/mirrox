import axios, { AxiosInstance } from 'axios';
import config from '../utils/config';
import {
  LocationAutocompleteResponse,
  LocationIQAutocompleteResult,
  LocationSuggestion,
} from '../models/Location';

export interface AutocompleteOptions {
  limit?: number;
  countryCodes?: string;
  viewbox?: string;
  bounded?: boolean;
  dedupe?: boolean;
  normalizeCity?: boolean;
  tag?: string;
}

class LocationService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.locationiq.baseUrl,
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Call LocationIQ autocomplete endpoint and normalize response
   */
  async autocomplete(
    query: string,
    options: AutocompleteOptions = {}
  ): Promise<LocationSuggestion[]> {
    try {
      const {
        limit = 5,
        viewbox,
        bounded,
        dedupe = true,
        normalizeCity = true,
        tag,
      } = options;

      const response = await this.client.get<LocationIQAutocompleteResult[]>(
        '/autocomplete.php',
        {
          params: {
            key: config.locationiq.apiKey,
            q: query,
            limit,
            countrycodes: 'my', // fixed to Malaysia
            viewbox,
            bounded: bounded ? 1 : undefined,
            dedupe: dedupe ? 1 : 0,
            normalizecity: normalizeCity ? 1 : 0,
            tag,
          },
        }
      );

      return response.data.map(this.mapSuggestion);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(
            'Location search service authentication failed. Please verify the LocationIQ API key.'
          );
        }

        if (error.response?.status === 429) {
          throw new Error(
            'Location search rate limit exceeded. Please wait a moment and try again.'
          );
        }

        if (error.response?.status === 400) {
          throw new Error('Invalid parameters provided for location search.');
        }

        const serviceMessage =
          error.response?.data && typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data)
            : error.message;

        throw new Error(
          `Location search service error: ${serviceMessage || 'unknown error'}`
        );
      }

      throw new Error('Location search service is currently unavailable.');
    }
  }

  private mapSuggestion(
    result: LocationIQAutocompleteResult
  ): LocationSuggestion {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error('Received invalid coordinates from LocationIQ service.');
    }

    const address = result.address || {};

    const normalizedAddress: LocationSuggestion['address'] = {};

    if (address.name) {
      normalizedAddress.name = address.name;
    }

    if (address.house_number) {
      normalizedAddress.houseNumber = address.house_number;
    }

    if (address.road) {
      normalizedAddress.road = address.road;
    }

    if (address.neighbourhood) {
      normalizedAddress.neighbourhood = address.neighbourhood;
    }

    if (address.suburb) {
      normalizedAddress.suburb = address.suburb;
    }

    const city = address.city || address.town || address.village;
    if (city) {
      normalizedAddress.city = city;
    }

    if (address.county) {
      normalizedAddress.county = address.county;
    }

    if (address.state) {
      normalizedAddress.state = address.state;
    }

    if (address.postcode) {
      normalizedAddress.postcode = address.postcode;
    }

    if (address.country) {
      normalizedAddress.country = address.country;
    }

    if (address.country_code) {
      normalizedAddress.countryCode = address.country_code;
    }

    return {
      placeId: result.place_id,
      displayName: result.display_name,
      latitude,
      longitude,
      type: result.type,
      address: normalizedAddress,
    };
  }
}

export const locationService = new LocationService();

export const locationAutocomplete = async (
  query: string,
  options?: AutocompleteOptions
): Promise<LocationAutocompleteResponse> => ({
  success: true,
  data: await locationService.autocomplete(query, options),
});

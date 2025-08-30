import { AirQualityData } from '../models/AirQuality';
import { backendApiService, AirQualityApiResponse } from './BackendApiService';

/**
 * Main API service that communicates with our backend
 * This replaces direct OpenAQ API calls with backend service calls
 */
class ApiService {
  /**
   * Fetch air quality data for given coordinates
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with air quality data
   */
  public async fetchAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityData> {
    try {
      console.log(
        `Fetching air quality data for ${latitude}, ${longitude} from backend`
      );

      const response: AirQualityApiResponse =
        await backendApiService.fetchAirQuality(latitude, longitude);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch air quality data');
      }

      // Transform backend response to match our app's expected format
      const airQualityData: AirQualityData = {
        location: {
          id: response.data.location.id,
          name: response.data.location.name,
          locality: response.data.location.locality,
          timezone: 'UTC', // Backend doesn't provide timezone, using default
          country: {
            id: 0, // Backend doesn't provide country ID, using default
            code: response.data.location.country.code,
            name: response.data.location.country.name,
          },
          coordinates: response.data.location.coordinates,
          sensors: [], // Backend doesn't expose sensors, using empty array
        },
        measurements: [], // Backend doesn't expose raw measurements, using empty array
        aqi: response.data.aqi,
        primaryPollutant: response.data.primaryPollutant,
        pm25: response.data.pm25,
        pm10: response.data.pm10,
        no2: response.data.no2,
        co: response.data.co,
        o3: response.data.o3,
        // Include UV data
        uvIndex: response.data.uvIndex,
        uvForecast: response.data.uvForecast,
        // Include AQICN specific fields
        classification: response.data.classification,
        colorCode: response.data.colorCode,
        healthAdvice: response.data.healthAdvice,
        source: response.data.source,
        timestamp: response.data.timestamp,
        stationUrl: response.data.stationUrl,
        attributions: response.data.attributions,
      };

      if (response.cached) {
        console.log(
          `Returned cached air quality data (age: ${response.cacheAge}ms)`
        );
      }

      console.log('Air quality data:', airQualityData);

      return airQualityData;
    } catch (error) {
      console.error('ApiService: Failed to fetch air quality data:', error);
      throw error;
    }
  }

  /**
   * Fetch air quality data specifically from AQICN
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with AQICN air quality data
   */
  public async fetchAQICNAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityData> {
    try {
      console.log(
        `Fetching AQICN air quality data for ${latitude}, ${longitude}`
      );

      const response: AirQualityApiResponse =
        await backendApiService.fetchAQICNAirQuality(latitude, longitude);

      if (!response.success || !response.data) {
        throw new Error(
          response.error || 'Failed to fetch AQICN air quality data'
        );
      }

      // Transform backend response to match our app's expected format
      const airQualityData: AirQualityData = {
        location: {
          id: response.data.location.id,
          name: response.data.location.name,
          locality: response.data.location.locality,
          timezone: 'UTC',
          country: {
            id: 0,
            code: response.data.location.country.code,
            name: response.data.location.country.name,
          },
          coordinates: response.data.location.coordinates,
          sensors: [],
        },
        measurements: [],
        aqi: response.data.aqi,
        primaryPollutant: response.data.primaryPollutant,
        pm25: response.data.pm25,
        pm10: response.data.pm10,
        no2: response.data.no2,
        co: response.data.co,
        o3: response.data.o3,
        classification: response.data.classification,
        colorCode: response.data.colorCode,
        healthAdvice: response.data.healthAdvice,
        source: response.data.source || 'aqicn',
        timestamp: response.data.timestamp,
        stationUrl: response.data.stationUrl,
        attributions: response.data.attributions,
      };

      if (response.cached) {
        console.log(`Returned cached AQICN data (age: ${response.cacheAge}ms)`);
      }

      console.log('AQICN air quality data:', airQualityData);

      return airQualityData;
    } catch (error) {
      console.error(
        'ApiService: Failed to fetch AQICN air quality data:',
        error
      );
      throw error;
    }
  }

  /**
   * Fetch AQICN station data by station ID
   * @param stationId AQICN station ID
   * @returns Promise with AQICN station data
   */
  public async fetchAQICNStationData(
    stationId: string
  ): Promise<AirQualityData> {
    try {
      console.log(`Fetching AQICN station data for ${stationId}`);

      const response: AirQualityApiResponse =
        await backendApiService.fetchAQICNStationData(stationId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch AQICN station data');
      }

      const airQualityData: AirQualityData = {
        location: {
          id: response.data.location.id,
          name: response.data.location.name,
          locality: response.data.location.locality,
          timezone: 'UTC',
          country: {
            id: 0,
            code: response.data.location.country.code,
            name: response.data.location.country.name,
          },
          coordinates: response.data.location.coordinates,
          sensors: [],
        },
        measurements: [],
        aqi: response.data.aqi,
        primaryPollutant: response.data.primaryPollutant,
        pm25: response.data.pm25,
        pm10: response.data.pm10,
        no2: response.data.no2,
        co: response.data.co,
        o3: response.data.o3,
        uvIndex: response.data.uvIndex,
        uvForecast: response.data.uvForecast,
        classification: response.data.classification,
        colorCode: response.data.colorCode,
        healthAdvice: response.data.healthAdvice,
        source: response.data.source || 'aqicn',
        timestamp: response.data.timestamp,
        stationUrl: response.data.stationUrl,
        attributions: response.data.attributions,
      };

      console.log('AQICN station data:', airQualityData);

      return airQualityData;
    } catch (error) {
      console.error('ApiService: Failed to fetch AQICN station data:', error);
      throw error;
    }
  }

  /**
   * Check if the backend service is available
   * @returns Promise with health status
   */
  public async checkBackendHealth(): Promise<boolean> {
    try {
      const health = await backendApiService.checkHealth();
      return health.success;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Get service status for debugging (development only)
   */
  public async getServiceStatus(): Promise<any> {
    try {
      return await backendApiService.getServiceStatus();
    } catch (error) {
      console.error('Failed to get service status:', error);
      return null;
    }
  }

  /**
   * Clear backend cache (development only)
   */
  public async clearCache(): Promise<void> {
    try {
      await backendApiService.clearCache();
      console.log('Backend cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear backend cache:', error);
      throw error;
    }
  }

  /**
   * Clear AQICN cache specifically (development only)
   */
  public async clearAQICNCache(): Promise<void> {
    try {
      await backendApiService.clearAQICNCache();
      console.log('AQICN cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear AQICN cache:', error);
      throw error;
    }
  }

  // Legacy methods for compatibility (these now do nothing since caching is handled by backend)

  /**
   * @deprecated Cache is now handled by the backend
   */
  public hasCachedData(latitude: number, longitude: number): boolean {
    console.warn(
      'hasCachedData is deprecated - caching is now handled by the backend'
    );
    return false;
  }

  /**
   * @deprecated Cache is now handled by the backend
   */
  public getCacheAge(latitude: number, longitude: number): number | null {
    console.warn(
      'getCacheAge is deprecated - caching is now handled by the backend'
    );
    return null;
  }
}

export const apiService = new ApiService();

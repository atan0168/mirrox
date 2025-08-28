import axios, { AxiosResponse } from 'axios';
import {
  AirQualityData,
  AirQualityLocation,
  AirQualityMeasurement,
  OpenAQResponse,
} from '../models/AirQuality';
import { cacheService } from './CacheService';
import { rateLimiterService } from './RateLimiterService';
import config from '../utils/config';

class ApiService {
  private readonly axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.openaq.baseUrl,
      headers: {
        'X-API-Key': config.openaq.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor to handle rate limit headers
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Update rate limiter with response headers
        const headers: Record<string, string | string[]> = {};
        Object.entries(response.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            headers[key] = value as string | string[];
          }
        });
        rateLimiterService.updateFromHeaders(headers);
        return response;
      },
      error => {
        // Handle rate limit headers even on error responses
        if (error.response?.headers) {
          const headers: Record<string, string | string[]> = {};
          Object.entries(error.response.headers).forEach(([key, value]) => {
            if (value !== undefined) {
              headers[key] = value as string | string[];
            }
          });
          rateLimiterService.updateFromHeaders(headers);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a rate-limited request to the OpenAQ API
   * @param url API endpoint URL
   * @param params Query parameters
   * @returns Promise with API response
   */
  private async makeRateLimitedRequest<T>(
    url: string,
    params?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    return rateLimiterService.executeWithRateLimit(async () => {
      return this.axiosInstance.get<T>(url, { params });
    });
  }

  /**
   * Calculate US EPA AQI from PM2.5 concentration
   * @param pm25 PM2.5 concentration in µg/m³
   * @returns AQI value
   */
  private calculateAQI(pm25: number): number {
    // US EPA AQI breakpoints for PM2.5 (24-hour average)
    const breakpoints = [
      { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
      { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
      { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
      { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
      { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
      { low: 250.5, high: 350.4, aqiLow: 301, aqiHigh: 400 },
      { low: 350.5, high: 500.4, aqiLow: 401, aqiHigh: 500 },
    ];

    for (const bp of breakpoints) {
      if (pm25 >= bp.low && pm25 <= bp.high) {
        const aqi =
          ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (pm25 - bp.low) +
          bp.aqiLow;
        return Math.round(aqi);
      }
    }

    // If concentration is above the highest breakpoint
    return 500;
  }

  /**
   * Determine primary pollutant based on available measurements
   * @param measurements Array of measurements
   * @returns Primary pollutant name
   */
  private determinePrimaryPollutant(
    measurements: AirQualityMeasurement[]
  ): string {
    // Find PM2.5 measurement (most commonly used for AQI)
    const pm25Measurement = measurements.find(
      m =>
        m.sensorsId === 2366 || // Common PM2.5 sensor ID pattern
        measurements.some(measure => measure.sensorsId === m.sensorsId)
    );

    if (pm25Measurement) return 'PM2.5';

    // Fallback to other pollutants
    if (measurements.some(m => m.sensorsId.toString().includes('pm10')))
      return 'PM10';
    if (measurements.some(m => m.sensorsId.toString().includes('no2')))
      return 'NO2';
    if (measurements.some(m => m.sensorsId.toString().includes('o3')))
      return 'O3';

    return 'Unknown';
  }

  /**
   * Extract pollutant values from measurements
   * @param measurements Array of measurements
   * @param location Location data with sensor information
   * @returns Object with pollutant values
   */
  private extractPollutantValues(
    measurements: AirQualityMeasurement[],
    location: AirQualityLocation
  ) {
    const values: { [key: string]: number } = {};

    measurements.forEach(measurement => {
      const sensor = location.sensors.find(s => s.id === measurement.sensorsId);
      if (sensor) {
        const paramName = sensor.parameter.name.toLowerCase();
        values[paramName] = measurement.value;
      }
    });

    return {
      pm25: values.pm25,
      pm10: values.pm10,
      no2: values.no2,
      co: values.co,
      o3: values.o3,
    };
  }

  public async fetchAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityData> {
    try {
      // Generate cache key
      const cacheKey = cacheService.generateLocationKey(latitude, longitude);

      // Check cache first
      const cachedData = cacheService.get<AirQualityData>(cacheKey);
      if (cachedData) {
        console.log(
          `Returning cached air quality data for ${latitude}, ${longitude}`
        );
        return cachedData;
      }

      console.log(
        `Fetching fresh air quality data for ${latitude}, ${longitude}`
      );

      // Step 1: Find nearby locations (with caching)
      const locationCacheKey = `${cacheKey}_locations`;
      let location: AirQualityLocation;

      const cachedLocation =
        cacheService.get<AirQualityLocation>(locationCacheKey);
      if (cachedLocation) {
        location = cachedLocation;
        console.log(`Using cached location data`);
      } else {
        const locationsResponse = await this.makeRateLimitedRequest<
          OpenAQResponse<AirQualityLocation>
        >('/locations', {
          coordinates: `${latitude},${longitude}`,
          radius: 25000, // 25km radius
          limit: 1,
          'order_by[]': 'distance',
        });

        if (!locationsResponse.data.results.length) {
          throw new Error(
            'No air quality monitoring stations found in your area'
          );
        }

        location = locationsResponse.data.results[0]!;

        // Cache location data for longer since it doesn't change often
        cacheService.set(
          locationCacheKey,
          location,
          config.cache.locationSearchTtl
        );
      }

      // Step 2: Get latest measurements for this location
      const measurementsResponse = await this.makeRateLimitedRequest<
        OpenAQResponse<AirQualityMeasurement>
      >(`/locations/${location.id}/latest`);

      const measurements = measurementsResponse.data.results;

      if (!measurements.length) {
        throw new Error(
          'No recent air quality measurements available for your area'
        );
      }

      // Step 3: Process the data
      const pollutantValues = this.extractPollutantValues(
        measurements,
        location
      );
      const primaryPollutant = this.determinePrimaryPollutant(measurements);

      // Calculate AQI based on PM2.5 if available
      let aqi: number | undefined;
      if (pollutantValues.pm25 !== undefined) {
        aqi = this.calculateAQI(pollutantValues.pm25);
      }

      const airQualityData: AirQualityData = {
        location,
        measurements,
        ...(aqi !== undefined && { aqi }),
        primaryPollutant,
        ...(pollutantValues.pm25 !== undefined && {
          pm25: pollutantValues.pm25,
        }),
        ...(pollutantValues.pm10 !== undefined && {
          pm10: pollutantValues.pm10,
        }),
        ...(pollutantValues.no2 !== undefined && { no2: pollutantValues.no2 }),
        ...(pollutantValues.co !== undefined && { co: pollutantValues.co }),
        ...(pollutantValues.o3 !== undefined && { o3: pollutantValues.o3 }),
      };

      // Cache the result
      cacheService.set(cacheKey, airQualityData, config.cache.airQualityTtl);

      console.log(
        `Air quality data fetched and cached for ${latitude}, ${longitude}`
      );

      return airQualityData;
    } catch (error) {
      console.error('Failed to fetch air quality from OpenAQ:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error(
            'API authentication failed. Please check the API key.'
          );
        } else if (error.response?.status === 429) {
          // Rate limited - check if we have cached data we can return
          const cacheKey = cacheService.generateLocationKey(
            latitude,
            longitude
          );
          const staleData = cacheService.get<AirQualityData>(cacheKey);

          if (staleData) {
            console.warn('Rate limited, returning cached data');
            return staleData;
          }

          const timeUntilReset = rateLimiterService.getTimeUntilReset();
          const minutesUntilReset = Math.ceil(timeUntilReset / (60 * 1000));
          throw new Error(
            `Too many requests. Please try again in ${minutesUntilReset} minute(s).`
          );
        } else if (error.response && error.response.status >= 500) {
          throw new Error('Air quality service is temporarily unavailable.');
        }
      }

      // Re-throw a custom error to be handled by the UI
      throw new Error(
        'Unable to connect to air quality services. Please check your internet connection.'
      );
    }
  }

  /**
   * Get cache statistics and rate limit status for debugging
   */
  public getServiceStatus(): {
    cache: { size: number; keys: string[] };
    rateLimit: any;
  } {
    return {
      cache: cacheService.getStats(),
      rateLimit: rateLimiterService.getRateLimitStatus(),
    };
  }

  /**
   * Clear cache manually (useful for testing or forcing fresh data)
   */
  public clearCache(): void {
    cacheService.clear();
    console.log('Air quality cache cleared');
  }

  /**
   * Check if data is available in cache without making API calls
   */
  public hasCachedData(latitude: number, longitude: number): boolean {
    const cacheKey = cacheService.generateLocationKey(latitude, longitude);
    return cacheService.has(cacheKey);
  }

  /**
   * Get cache age for location data
   */
  public getCacheAge(latitude: number, longitude: number): number | null {
    const cacheKey = cacheService.generateLocationKey(latitude, longitude);
    return cacheService.getAge(cacheKey);
  }
}

export const apiService = new ApiService();

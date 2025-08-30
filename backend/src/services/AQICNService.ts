import axios, { AxiosResponse } from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  AQICNResponse,
  AQICNData,
  AirQualityData,
  StationSearchResult,
} from '../models/AirQuality';
import { cacheService } from './CacheService';
import { aqicnRateLimiterService } from './AQICNRateLimiterService';
import config from '../utils/config';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

class AQICNService {
  private readonly axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.aqicn.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        console.error('AQICN API Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a rate-limited request to AQICN API
   */
  private async makeRateLimitedRequest<T>(
    url: string,
    params: Record<string, unknown>
  ): Promise<T> {
    return aqicnRateLimiterService.executeWithRateLimit(async () => {
      const response = await this.axiosInstance.get<T>(url, { params });
      return response.data;
    });
  }

  /**
   * Parse timezone offset from AQICN format (e.g., "+08:00") to minutes
   */
  private parseTimezoneOffset(timezoneStr: string): number {
    try {
      // Handle formats like "+08:00", "-05:00", etc.
      const match = timezoneStr.match(/^([+-])(\d{2}):(\d{2})$/);
      if (!match) {
        console.warn(
          `Unable to parse timezone: ${timezoneStr}, defaulting to UTC`
        );
        return 0;
      }

      const [, sign, hours, minutes] = match;
      if (!hours || !minutes) {
        console.warn(`Invalid timezone format: ${timezoneStr}`);
        return 0;
      }
      const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
      return sign === '+' ? totalMinutes : -totalMinutes;
    } catch (error) {
      console.warn(`Error parsing timezone ${timezoneStr}:`, error);
      return 0;
    }
  }

  /**
   * Get AQI classification and color based on AQI value
   */
  private getAQIInfo(aqi: number): {
    classification: string;
    colorCode: string;
    healthAdvice: string;
  } {
    if (aqi <= 50) {
      return {
        classification: 'Good',
        colorCode: '#00E400',
        healthAdvice:
          'Air quality is considered satisfactory, and air pollution poses little or no risk.',
      };
    } else if (aqi <= 100) {
      return {
        classification: 'Moderate',
        colorCode: '#FFFF00',
        healthAdvice:
          'Air quality is acceptable for most people. However, sensitive people may experience minor respiratory symptoms.',
      };
    } else if (aqi <= 150) {
      return {
        classification: 'Unhealthy for Sensitive Groups',
        colorCode: '#FF7E00',
        healthAdvice:
          'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
      };
    } else if (aqi <= 200) {
      return {
        classification: 'Unhealthy',
        colorCode: '#FF0000',
        healthAdvice:
          'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
      };
    } else if (aqi <= 300) {
      return {
        classification: 'Very Unhealthy',
        colorCode: '#8F3F97',
        healthAdvice:
          'Health warnings of emergency conditions. The entire population is more likely to be affected.',
      };
    } else {
      return {
        classification: 'Hazardous',
        colorCode: '#7E0023',
        healthAdvice:
          'Health alert: everyone may experience more serious health effects.',
      };
    }
  }

  /**
   * Convert AQICN data to unified air quality format
   */
  private convertToUnifiedFormat(aqicnData: AQICNData): AirQualityData {
    const aqiInfo = this.getAQIInfo(aqicnData.aqi);

    // Extract pollutant values from iaqi object
    const pollutants = {
      pm25: aqicnData.iaqi.pm25?.v || null,
      pm10: aqicnData.iaqi.pm10?.v || null,
      so2: aqicnData.iaqi.so2?.v || null,
      no2: aqicnData.iaqi.no2?.v || null,
      o3: aqicnData.iaqi.o3?.v || null,
      co: aqicnData.iaqi.co?.v || null,
    };

    // Extract UV data from forecast if available
    const uvForecast = aqicnData.forecast?.daily?.uvi || null;
    let currentUVIndex: number | null = null;

    if (uvForecast && uvForecast.length > 0) {
      // Parse timezone from AQICN data (e.g., "+08:00")
      const stationTimezone = aqicnData.time.tz;
      const timezoneOffsetMinutes = this.parseTimezoneOffset(stationTimezone);

      // Get today's date in the station's timezone
      const todayInStationTz = dayjs()
        .utc()
        .add(timezoneOffsetMinutes, 'minute')
        .format('YYYY-MM-DD');

      console.log(
        `Looking for UV forecast for date: ${todayInStationTz} in timezone: ${stationTimezone} (offset: ${timezoneOffsetMinutes} minutes)`
      );

      // Find today's UV forecast
      const todaysForecast = uvForecast.find(
        (forecast: { avg: number; day: string; max: number; min: number }) =>
          forecast.day === todayInStationTz
      );

      if (todaysForecast) {
        currentUVIndex = todaysForecast.avg;
        console.log(
          `Found UV forecast for today (${todayInStationTz}): UV Index ${currentUVIndex} (avg), max: ${todaysForecast.max}, min: ${todaysForecast.min}`
        );
      } else {
        // Try to find the closest date or use first available
        console.log(
          `Available UV forecast dates:`,
          uvForecast.map(f => f.day)
        );

        // Fallback to first forecast entry if today's date not found
        const firstForecast = uvForecast[0];
        currentUVIndex = firstForecast?.avg || 0;
        console.log(
          `Today's UV forecast not found for ${todayInStationTz}, using first available: UV Index ${currentUVIndex} for date: ${firstForecast?.day || 'unknown'}`
        );
      }
    } else {
      console.log('No UV forecast data available in AQICN response');
    }

    // Create a mock location object compatible with existing interface
    const location = {
      id: aqicnData.idx,
      name: aqicnData.city.name,
      locality: null,
      timezone: aqicnData.time.tz,
      country: {
        id: 0,
        code: '',
        name: '',
      },
      coordinates: {
        latitude: aqicnData.city.geo[0],
        longitude: aqicnData.city.geo[1],
      },
      sensors: [], // AQICN doesn't provide detailed sensor info
    };

    // Create mock measurements for compatibility
    const measurements = Object.entries(pollutants)
      .filter(([_, value]) => value !== null)
      .map(([pollutant, value], index) => ({
        datetime: {
          utc: aqicnData.time.s,
          local: aqicnData.time.s,
        },
        value: value!,
        coordinates: {
          latitude: aqicnData.city.geo[0],
          longitude: aqicnData.city.geo[1],
        },
        sensorsId: index + 1,
        locationsId: aqicnData.idx,
      }));

    return {
      location,
      measurements,
      aqi: aqicnData.aqi,
      primaryPollutant: aqicnData.dominentpol,
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      no2: pollutants.no2,
      co: pollutants.co,
      o3: pollutants.o3,
      // Add UV data
      uvIndex: currentUVIndex,
      uvForecast: uvForecast,
      // Add AQICN specific data
      classification: aqiInfo.classification,
      colorCode: aqiInfo.colorCode,
      healthAdvice: aqiInfo.healthAdvice,
      source: 'aqicn' as const,
      timestamp: aqicnData.time.s,
      stationUrl: aqicnData.city.url,
      attributions: aqicnData.attributions,
    } as AirQualityData & {
      classification: string;
      colorCode: string;
      healthAdvice: string;
      source: 'aqicn';
      timestamp: string;
      stationUrl: string;
      attributions: typeof aqicnData.attributions;
    };
  }

  /**
   * Fetch air quality data by coordinates
   */
  public async fetchAirQualityByCoordinates(
    latitude: number,
    longitude: number
  ): Promise<AirQualityData> {
    try {
      // Generate cache key
      const cacheKey = `aqicn_${cacheService.generateLocationKey(latitude, longitude)}`;

      // Check cache first
      const cachedData = cacheService.get<AirQualityData>(cacheKey);
      if (cachedData) {
        console.log(
          `Returning cached AQICN data for ${latitude}, ${longitude}`
        );
        return cachedData;
      }

      console.log(`Fetching fresh AQICN data for ${latitude}, ${longitude}`);

      // Make rate-limited API request
      const responseData = await this.makeRateLimitedRequest<AQICNResponse>(
        `/feed/geo:${latitude};${longitude}/`,
        {
          token: config.aqicn.apiKey,
        }
      );

      if (responseData.status !== 'ok') {
        throw new Error(`AQICN API error: ${responseData.status}`);
      }

      // Convert to unified format
      const airQualityData = this.convertToUnifiedFormat(responseData.data);

      // Cache the result - AQICN data is refreshed every hour
      cacheService.set(cacheKey, airQualityData, config.cache.airQualityTtl);

      console.log(
        `AQICN data fetched and cached for ${latitude}, ${longitude}`
      );

      return airQualityData;
    } catch (error) {
      console.error('Failed to fetch air quality from AQICN:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error(
            'AQICN API authentication failed. Please check the API key.'
          );
        } else if (error.response?.status === 429) {
          const rateLimitStatus = this.getRateLimitStatus();
          throw new Error(
            `Too many requests to AQICN API. Rate limit exceeded (${rateLimitStatus.requestCount}/${rateLimitStatus.limit}). Please try again in ${Math.ceil(rateLimitStatus.timeUntilReset / 1000)} seconds.`
          );
        } else if (error.response?.status === 404) {
          throw new Error(
            'No air quality monitoring stations found in your area (AQICN).'
          );
        } else if (error.response && error.response.status >= 500) {
          throw new Error('AQICN service is temporarily unavailable.');
        }
      }

      throw new Error(
        'Unable to connect to AQICN services. Please check your internet connection.'
      );
    }
  }

  /**
   * Fetch air quality data by station ID
   */
  public async fetchAirQualityByStationId(
    stationId: string
  ): Promise<AirQualityData> {
    try {
      // Generate cache key
      const cacheKey = `aqicn_station_${stationId}`;

      // Check cache first
      const cachedData = cacheService.get<AirQualityData>(cacheKey);
      if (cachedData) {
        console.log(`Returning cached AQICN data for station ${stationId}`);
        return cachedData;
      }

      console.log(`Fetching fresh AQICN data for station ${stationId}`);

      // Make rate-limited API request
      const responseData = await this.makeRateLimitedRequest<AQICNResponse>(
        `/feed/@${stationId}/`,
        {
          token: config.aqicn.apiKey,
        }
      );

      if (responseData.status !== 'ok') {
        throw new Error(`AQICN API error: ${responseData.status}`);
      }

      // Convert to unified format
      const airQualityData = this.convertToUnifiedFormat(responseData.data);

      // Cache the result
      cacheService.set(cacheKey, airQualityData, config.cache.airQualityTtl);

      console.log(`AQICN data fetched and cached for station ${stationId}`);

      return airQualityData;
    } catch (error) {
      console.error(
        `Failed to fetch air quality from AQICN station ${stationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Search for air quality stations near coordinates
   */
  public async searchStations(
    latitude: number,
    longitude: number,
    radius: number = 50
  ): Promise<StationSearchResult[]> {
    try {
      // AQICN doesn't have a direct search endpoint, so we'll use the main feed
      // and extract station information from the response
      const data = await this.fetchAirQualityByCoordinates(latitude, longitude);

      // Return the single station found
      return [
        {
          name: data.location.name,
          stationId: data.location.id.toString(),
          distance: 0, // AQICN returns the closest station
          aqi: data.aqi || 0,
        },
      ];
    } catch (error) {
      console.error('Failed to search AQICN stations:', error);
      return [];
    }
  }

  /**
   * Check if data is available in cache
   */
  public hasCachedData(latitude: number, longitude: number): boolean {
    const cacheKey = `aqicn_${cacheService.generateLocationKey(latitude, longitude)}`;
    return cacheService.has(cacheKey);
  }

  /**
   * Get cache age for location data
   */
  public getCacheAge(latitude: number, longitude: number): number | null {
    const cacheKey = `aqicn_${cacheService.generateLocationKey(latitude, longitude)}`;
    return cacheService.getAge(cacheKey);
  }

  /**
   * Clear AQICN cache
   */
  public clearCache(): void {
    // Get all cache keys and filter for AQICN keys
    const stats = cacheService.getStats();
    const aqicnKeys = stats.keys.filter(key => key.startsWith('aqicn_'));

    aqicnKeys.forEach(key => {
      cacheService.delete(key);
    });

    console.log(`Cleared ${aqicnKeys.length} AQICN cache entries`);
  }

  /**
   * Get rate limit status for monitoring
   */
  public getRateLimitStatus(): {
    requestCount: number;
    limit: number;
    remaining: number;
    resetTime: number;
    timeUntilReset: number;
  } {
    const status = aqicnRateLimiterService.getRateLimitStatus();
    return {
      requestCount: status.requestCount,
      limit: status.limit,
      remaining: status.remaining,
      resetTime: status.windowStart + config.aqicn.rateLimit.windowMs,
      timeUntilReset: status.timeUntilReset,
    };
  }

  /**
   * Get service health status including cache and rate limit info
   */
  public getServiceStatus(): {
    cache: {
      aqicnEntries: number;
      totalSize: number;
    };
    rateLimit: {
      requestCount: number;
      limit: number;
      remaining: number;
      resetTime: number;
      timeUntilReset: number;
    };
  } {
    const stats = cacheService.getStats();
    const aqicnKeys = stats.keys.filter(key => key.startsWith('aqicn_'));

    return {
      cache: {
        aqicnEntries: aqicnKeys.length,
        totalSize: stats.size,
      },
      rateLimit: this.getRateLimitStatus(),
    };
  }
}

export const aqicnService = new AQICNService();

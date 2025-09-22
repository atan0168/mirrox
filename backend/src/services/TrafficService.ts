import axios, { AxiosResponse } from 'axios';
import {
  TrafficFlowResponse,
  CongestionData,
  CongestionThresholds,
} from '../models/Traffic';
import { cacheService } from './CacheService';
import config from '../utils/config';

class TrafficService {
  private readonly axiosInstance;
  private readonly congestionThresholds: CongestionThresholds = {
    none: { max: 1.3 },
    mild: { min: 1.3, max: 2.0 },
    moderate: { min: 2.0, max: 3.0 },
    high: { min: 3.0 },
  };

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.tomtom.com/traffic/services/4',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Calculate congestion factor from travel times
   * @param currentTravelTime Current travel time in seconds
   * @param freeFlowTravelTime Free flow travel time in seconds
   * @returns Congestion factor (1.0 = no congestion)
   */
  private calculateCongestionFactor(
    currentTravelTime: number,
    freeFlowTravelTime: number
  ): number {
    if (freeFlowTravelTime === 0) return 1.0;
    return Math.max(1.0, currentTravelTime / freeFlowTravelTime);
  }

  /**
   * Generate cache key for traffic data
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Cache key string
   */
  private generateCacheKey(latitude: number, longitude: number): string {
    return cacheService.generateLocationKey(latitude, longitude, 'traffic');
  }

  /**
   * Fetch traffic flow data from TomTom API
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with congestion data
   */
  public async getCongestionFactor(
    latitude: number,
    longitude: number
  ): Promise<CongestionData> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(latitude, longitude);

      // Check cache first
      const cachedData = cacheService.get<CongestionData>(cacheKey);
      if (cachedData) {
        console.log(
          `Returning cached traffic data for ${latitude}, ${longitude}`
        );
        return {
          ...cachedData,
          cached: true,
        };
      }

      console.log(`Fetching fresh traffic data for ${latitude}, ${longitude}`);

      // Make API request to TomTom Traffic Flow API
      const response: AxiosResponse<TrafficFlowResponse> =
        await this.axiosInstance.get(`/flowSegmentData/absolute/10/json`, {
          params: {
            key: config.tomtom.apiKey,
            point: `${latitude},${longitude}`,
            unit: 'KMPH',
          },
        });

      const flowData = response.data.flowSegmentData;

      // Calculate congestion factor
      const congestionFactor = this.calculateCongestionFactor(
        flowData.currentTravelTime,
        flowData.freeFlowTravelTime
      );

      // Prepare response data
      const congestionData: CongestionData = {
        latitude,
        longitude,
        congestionFactor: Math.round(congestionFactor * 100) / 100, // Round to 2 decimal places
        currentSpeed: flowData.currentSpeed,
        freeFlowSpeed: flowData.freeFlowSpeed,
        currentTravelTime: flowData.currentTravelTime,
        freeFlowTravelTime: flowData.freeFlowTravelTime,
        confidence: flowData.confidence,
        roadClosure: flowData.roadClosure,
        timestamp: new Date().toISOString(),
        cached: false,
      };

      // Cache the result
      cacheService.set(cacheKey, congestionData, config.cache.trafficTtl);

      console.log(
        `Traffic data fetched and cached for ${latitude}, ${longitude} - Congestion Factor: ${congestionFactor}`
      );

      return congestionData;
    } catch (error) {
      console.error('Failed to fetch traffic data from TomTom:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(
            'TomTom API authentication failed. Please check the API key.'
          );
        } else if (error.response?.status === 429) {
          // Rate limited - check if we have cached data we can return
          const cacheKey = this.generateCacheKey(latitude, longitude);
          const staleData = cacheService.get<CongestionData>(cacheKey);

          if (staleData) {
            console.warn('Rate limited, returning cached traffic data');
            return {
              ...staleData,
              cached: true,
            };
          }

          throw new Error(
            'Too many requests to traffic service. Please try again later.'
          );
        } else if (error.response?.status === 400) {
          throw new Error('Invalid coordinates provided for traffic data.');
        } else if (error.response && error.response.status >= 500) {
          throw new Error('Traffic data is currently unavailable');
        }
      }

      // Network or other errors
      throw new Error('Traffic data is currently unavailable');
    }
  }

  /**
   * Get congestion thresholds for reference
   * @returns Congestion thresholds configuration
   */
  public getCongestionThresholds(): CongestionThresholds {
    return this.congestionThresholds;
  }

  /**
   * Check if traffic data is available in cache
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns True if cached data exists
   */
  public hasCachedData(latitude: number, longitude: number): boolean {
    const cacheKey = this.generateCacheKey(latitude, longitude);
    return cacheService.has(cacheKey);
  }

  /**
   * Get cache age for traffic data
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Cache age in milliseconds or null if not cached
   */
  public getCacheAge(latitude: number, longitude: number): number | null {
    const cacheKey = this.generateCacheKey(latitude, longitude);
    return cacheService.getAge(cacheKey);
  }

  /**
   * Clear traffic cache manually
   */
  public clearCache(): void {
    // Clear all traffic-related cache entries
    const stats = cacheService.getStats();
    const trafficKeys = stats.keys.filter(key => key.includes('traffic'));

    trafficKeys.forEach(key => {
      cacheService.delete(key);
    });

    console.log(`Cleared ${trafficKeys.length} traffic cache entries`);
  }
}

export const trafficService = new TrafficService();

import axios from 'axios';
import { API_BASE_URL } from '../constants';

export interface CongestionData {
  latitude: number;
  longitude: number;
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  stressLevel: 'none' | 'mild' | 'moderate' | 'high';
  confidence: number;
  roadClosure: boolean;
  timestamp: string;
  cached: boolean;
}

export interface TrafficResponse {
  success: boolean;
  data: CongestionData;
  thresholds: {
    none: { max: number };
    mild: { min: number; max: number };
    moderate: { min: number; max: number };
    high: { min: number };
  };
  meta: {
    requestedCoordinates: { latitude: number; longitude: number };
    cacheAge: number | null;
    timestamp: string;
  };
}

class TrafficService {
  private readonly baseUrl = `${API_BASE_URL}/traffic`;

  /**
   * Get congestion factor for given coordinates
   */
  async getCongestionFactor(
    latitude: number,
    longitude: number
  ): Promise<CongestionData> {
    try {
      console.log(`🚗 Fetching traffic data for ${latitude}, ${longitude}`);

      const response = await axios.get<TrafficResponse>(
        `${this.baseUrl}/congestion`,
        {
          params: { lat: latitude, lng: longitude },
          timeout: 5000, // Reduced timeout to 5 seconds for faster failure detection
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch traffic data');
      }

      console.log(`🚗 Traffic data received:`, {
        congestionFactor: response.data.data.congestionFactor,
        stressLevel: response.data.data.stressLevel,
        cached: response.data.data.cached,
      });

      return response.data.data;
    } catch (error) {
      console.error('Traffic service error:', error);

      // Check if this is a specific traffic API error
      if (axios.isAxiosError(error)) {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.response?.status === 503 ||
          error.response?.status === 502 ||
          error.response?.status === 504
        ) {
          // TomTom API is unresponsive/unavailable
          throw new Error('Traffic data is currently unavailable');
        }
        if (error.response?.status === 500) {
          throw new Error('Traffic data is currently unavailable');
        }
      }

      // For other network errors or timeouts
      if (
        error instanceof Error &&
        (error.message.includes('timeout') ||
          error.message.includes('Network Error'))
      ) {
        throw new Error('Traffic data is currently unavailable');
      }

      // For any other traffic service specific errors
      throw new Error('Traffic data is currently unavailable');
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<unknown> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get traffic service status:', error);
      throw error;
    }
  }
}

export const trafficService = new TrafficService();

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
          timeout: 10000,
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

      // Return default values on error (no stress)
      return {
        latitude,
        longitude,
        congestionFactor: 1.0,
        currentSpeed: 0,
        freeFlowSpeed: 0,
        currentTravelTime: 0,
        freeFlowTravelTime: 0,
        stressLevel: 'none',
        confidence: 0,
        roadClosure: false,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<any> {
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


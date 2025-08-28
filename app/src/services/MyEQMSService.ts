import { BACKEND_API_URL } from '../constants';
import { UnifiedAirQualityData } from '../models/AirQuality';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

interface TrendData {
  timestamps: number[];
  values: (number | null)[];
  parameter: string;
  stationId: string;
}

export class MyEQMSService {
  private static instance: MyEQMSService;

  static getInstance(): MyEQMSService {
    if (!MyEQMSService.instance) {
      MyEQMSService.instance = new MyEQMSService();
    }
    return MyEQMSService.instance;
  }

  /**
   * Make request to backend (React Query will handle caching)
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${await getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`
      );
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown backend error');
    }

    return result.data as T;
  }

  /**
   * Get Malaysian air quality data by location
   */
  async getStationsByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<UnifiedAirQualityData[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radiusKm.toString(),
    });

    return this.makeRequest<UnifiedAirQualityData[]>(`/malaysia?${params}`);
  }

  /**
   * Get stations by Malaysian state
   */
  async getStationsByState(
    stateName: string
  ): Promise<UnifiedAirQualityData[]> {
    return this.makeRequest<UnifiedAirQualityData[]>(
      `/malaysia/state/${encodeURIComponent(stateName)}`
    );
  }

  /**
   * Get stations by Malaysian region
   */
  async getStationsByRegion(
    regionName: string
  ): Promise<UnifiedAirQualityData[]> {
    return this.makeRequest<UnifiedAirQualityData[]>(
      `/malaysia/region/${encodeURIComponent(regionName)}`
    );
  }

  /**
   * Get specific station data by ID
   */
  async getStationById(
    stationId: string
  ): Promise<UnifiedAirQualityData | null> {
    try {
      return await this.makeRequest<UnifiedAirQualityData>(
        `/malaysia/station/${encodeURIComponent(stationId)}`
      );
    } catch (error) {
      // If station not found, return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all active Malaysian stations
   */
  async getAllActiveStations(): Promise<UnifiedAirQualityData[]> {
    return this.makeRequest<UnifiedAirQualityData[]>('/malaysia/stations');
  }

  /**
   * Get trend data for a station
   */
  async getTrendData(
    stationId: string,
    parameter: 'api' | 'pm25' | 'pm10' | 'temperature' | 'humidity' = 'api',
    hoursBack: number = 24
  ): Promise<TrendData> {
    const params = new URLSearchParams({
      parameter,
      hours: hoursBack.toString(),
    });

    return this.makeRequest<TrendData>(
      `/malaysia/station/${encodeURIComponent(stationId)}/trend?${params}`
    );
  }

  /**
   * Get Malaysian air quality classification color
   */
  getClassificationColor(api: number | null): string {
    if (!api) return '#9CA3AF'; // Gray for no data

    if (api <= 50) return '#10B981'; // Green - Good
    if (api <= 100) return '#F59E0B'; // Yellow - Moderate
    if (api <= 200) return '#EF4444'; // Red - Unhealthy
    if (api <= 300) return '#7C3AED'; // Purple - Very Unhealthy
    return '#991B1B'; // Dark Red - Hazardous
  }

  /**
   * Get health advice based on API level
   */
  getHealthAdvice(api: number | null): string {
    if (!api) return 'No data available';

    if (api <= 50) {
      return 'Air quality is satisfactory. Enjoy outdoor activities!';
    }
    if (api <= 100) {
      return 'Air quality is acceptable. Sensitive individuals should consider limiting outdoor exertion.';
    }
    if (api <= 200) {
      return 'Unhealthy air quality. Everyone should reduce outdoor activities, especially sensitive groups.';
    }
    if (api <= 300) {
      return 'Very unhealthy air quality. Avoid outdoor activities. Use air purifiers indoors.';
    }
    return 'Hazardous air quality. Stay indoors and avoid all outdoor activities.';
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default MyEQMSService;

import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL } from '../constants';

export interface AirQualityApiResponse {
  success: boolean;
  data?: {
    location: {
      id: number;
      name: string;
      locality: string | null;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      country: {
        code: string;
        name: string;
      };
    };
    aqi?: number;
    primaryPollutant?: string;
    pm25?: number;
    pm10?: number;
    no2?: number;
    co?: number;
    o3?: number;
    temperature?: number | null;
    humidity?: number | null;
    // UV data from AQICN forecast
    uvIndex?: number;
    uvForecast?: Array<{ avg: number; day: string; max: number; min: number }>;
    // AQICN specific fields
    classification?: string;
    colorCode?: string;
    healthAdvice?: string;
    source?: 'openaq' | 'aqicn';
    timestamp?: string;
    stationUrl?: string;
    attributions?: Array<{
      url: string;
      name: string;
      logo?: string;
    }>;
  };
  error?: string;
  cached?: boolean;
  cacheAge?: number;
}

export interface StationSearchResult {
  name: string;
  stationId: string;
  distance: number;
  aqi: number;
}

// Types for dengue prediction
export interface DenguePredictResponse {
  state: string;
  as_of: {
    ew_year: number;
    ew: number;
    week_start: string;
    week_end: string;
    source: string;
  };
  season: {
    lags: number;
    prob_in_season: number;
    in_season: boolean;
    threshold: number;
  };
  trend: {
    lags: number;
    prob_trend_increase_next_week: number;
    trend_increase: boolean;
    threshold: number;
  };
}

// Minimal ArcGIS response types for dengue nearby endpoints
export interface ArcGISField {
  name: string;
  type: string;
  alias: string;
  length?: number;
}
export interface ArcGISSpatialReference {
  wkid?: number;
  latestWkid?: number;
}
export interface ArcGISFeature<TAttributes, TGeometry = undefined> {
  attributes: TAttributes;
  geometry?: TGeometry;
}
export interface ArcGISResponse<TAttributes, TGeometry = undefined> {
  fields: ArcGISField[];
  features: Array<ArcGISFeature<TAttributes, TGeometry>>;
  geometryType?: string;
  spatialReference?: ArcGISSpatialReference;
}
export interface PointGeometry {
  x: number;
  y: number;
}
export interface PolygonGeometry {
  rings: number[][][];
}
export interface HotspotAttributes {
  'SPWD.DBO_LOKALITI_POINTS.LOKALITI': string;
  'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES': number;
}
export interface OutbreakAttributes {
  'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI': string;
  'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES': number;
}

class BackendApiService {
  private readonly axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000, // 15 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging in development
    this.axiosInstance.interceptors.request.use(
      config => {
        if (__DEV__) {
          console.log(`Making API request to: ${config.baseURL}${config.url}`);
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      error => {
        if (__DEV__) {
          console.error('API request failed:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch air quality data for given coordinates
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with air quality data
   */
  async fetchAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityApiResponse> {
    try {
      const response = await this.axiosInstance.get<AirQualityApiResponse>(
        '/air-quality',
        {
          params: {
            latitude,
            longitude,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch air quality data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        } else if (
          error.code === 'NETWORK_ERROR' ||
          error.code === 'ECONNREFUSED'
        ) {
          throw new Error(
            'Unable to connect to the backend service. Please check your connection.'
          );
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please try again.');
        }
      }

      throw new Error(
        'An unexpected error occurred while fetching air quality data.'
      );
    }
  }

  /**
   * Fetch air quality data from AQICN by coordinates
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with AQICN air quality data
   */
  async fetchAQICNAirQuality(
    latitude: number,
    longitude: number
  ): Promise<AirQualityApiResponse> {
    try {
      const response = await this.axiosInstance.get<AirQualityApiResponse>(
        '/air-quality/aqicn',
        {
          params: {
            latitude,
            longitude,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch AQICN air quality data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw new Error(
        'An unexpected error occurred while fetching AQICN air quality data.'
      );
    }
  }

  /**
   * Fetch air quality data from AQICN by station ID
   * @param stationId AQICN station ID
   * @returns Promise with AQICN station data
   */
  async fetchAQICNStationData(
    stationId: string
  ): Promise<AirQualityApiResponse> {
    try {
      const response = await this.axiosInstance.get<AirQualityApiResponse>(
        `/air-quality/aqicn/station/${stationId}`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch AQICN station data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw new Error(
        'An unexpected error occurred while fetching AQICN station data.'
      );
    }
  }

  /**
   * Search for AQICN stations near coordinates
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param radius Search radius in kilometers (optional)
   * @returns Promise with array of stations
   */
  async searchAQICNStations(
    latitude: number,
    longitude: number,
    radius?: number
  ): Promise<{
    success: boolean;
    data?: StationSearchResult[];
    error?: string;
  }> {
    try {
      const params: any = { latitude, longitude };
      if (radius) params.radius = radius;

      const response = await this.axiosInstance.get(
        '/air-quality/aqicn/search',
        { params }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to search AQICN stations:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw new Error(
        'An unexpected error occurred while searching AQICN stations.'
      );
    }
  }

  /**
   * Clear AQICN cache (development only)
   */
  async clearAQICNCache(): Promise<void> {
    try {
      await this.axiosInstance.post('/air-quality/aqicn/clear-cache');
    } catch (error) {
      console.error('Failed to clear AQICN cache:', error);
      throw error;
    }
  }

  /**
   * Check if the backend service is healthy
   * @returns Promise with health status
   */
  async checkHealth(): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: 'Backend service is not available',
      };
    }
  }

  /**
   * Get service status and statistics (development only)
   * @returns Promise with service status
   */
  async getServiceStatus(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/air-quality/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get service status:', error);
      throw error;
    }
  }

  /** Dengue prediction via backend -> Python microservice */
  async fetchDenguePrediction(
    state: string,
    params?: {
      season_lags?: number;
      trend_lags?: number;
      season_threshold?: number;
      trend_threshold?: number;
      ref_year?: number;
      ref_ew?: number;
      live?: boolean;
    }
  ): Promise<{
    success: boolean;
    data?: DenguePredictResponse;
    error?: string;
  }> {
    try {
      const response = await this.axiosInstance.get('/dengue/predict', {
        params: { state, ...(params || {}) },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dengue prediction:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Unable to fetch dengue prediction.');
    }
  }

  // Dengue nearby queries (live ArcGIS via backend)
  async fetchDengueHotspots(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ArcGISResponse<HotspotAttributes, PointGeometry>> {
    const response = await this.axiosInstance.get('/dengue/hotspots', {
      params: { latitude, longitude, radius: radiusKm },
    });
    return response.data.data as ArcGISResponse<
      HotspotAttributes,
      PointGeometry
    >;
  }

  async fetchDengueOutbreaks(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ArcGISResponse<OutbreakAttributes, PolygonGeometry>> {
    const response = await this.axiosInstance.get('/dengue/outbreaks', {
      params: { latitude, longitude, radius: radiusKm },
    });
    return response.data.data as ArcGISResponse<
      OutbreakAttributes,
      PolygonGeometry
    >;
  }

  /**
   * Clear cache (development only)
   */
  async clearCache(): Promise<void> {
    try {
      await this.axiosInstance.post('/air-quality/clear-cache');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }
}

export const backendApiService = new BackendApiService();

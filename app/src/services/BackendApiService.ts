import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../constants';
import { useSandboxStore } from '../store/sandboxStore';
import {
  LocationAutocompleteResponse,
  LocationSuggestion,
} from '../models/Location';

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
  'SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK'?: number;
}

export interface OutbreakAttributes {
  'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI': string;
  'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES': number;
}

export interface StateAttributes {
  NEGERI: string;
  JUMLAH_HARIAN: number;
  JUMLAH_SPATIALHARIAN: number;
  JUMLAH_SPATIALKUMCURR: number;
  JUMLAH_KUMULATIF: number;
  JUMLAH_KEMATIAN: number;
}

export interface SmartPromptSuggestion {
  key?: string;
  name: string;
}

export interface SmartPromptResponse {
  ok: boolean;
  ask?: string;
  suggestion?: SmartPromptSuggestion;
  error?: string;
}

export interface SmartPromptMealEventPayload {
  food_id?: string | null;
  food_name: string;
  source: string;
}

export interface ExtractMealRequestPayload {
  text?: string;
  imageBase64?: string;
  imageUrl?: string;
  user_id?: string;
}

export interface ExtractedMealItem {
  name: string;
  portion?: string | null;
  modifiers?: string[];
}

export interface ExtractMealResponseData {
  FOOD_ITEM: ExtractedMealItem[];
  DRINK_ITEM: ExtractedMealItem[];
  raw: string;
  ocr?: string;
  image_url?: string;
}

export interface ExtractMealApiResponse {
  ok: boolean;
  data?: ExtractMealResponseData;
  error?: string;
}

export interface AnalyzeFoodRequestPayload {
  text?: string;
  imageBase64?: string;
  selectedFoodId?: string;
  skipExtraction?: boolean;
}

export interface ItemNutrient {
  id?: string;
  display_name?: string;
  name: string;
  source?: string;
  portion_text?: string | null;
  modifiers?: string[];
  energy_kcal?: number;
  sugar_g?: number;
  fiber_g?: number;
  fat_g?: number;
  sodium_mg?: number;
  sat_fat_g?: number;
  protein_g?: number;
}

export interface AnalyzeSource {
  key: string;
  label: string;
  url?: string;
}

export type AnalyzeMealItem = ItemNutrient & {
  source?: string;
};

export interface AnalyzeFoodResponseData {
  nutrients: {
    total: {
      energy_kcal: number;
      sugar_g: number;
      fiber_g: number;
      fat_g: number;
      sodium_mg: number;
      sat_fat_g: number;
      protein_g: number;
    };
    per_item: Array<AnalyzeMealItem>;
  };
  tags: string[];
  tags_display?: string[];
  tips: string[];
  canonical?: Array<AnalyzeMealItem>;
  sources?: AnalyzeSource[];
}

export interface AnalyzeMealApiResponse {
  ok: boolean;
  data?: AnalyzeFoodResponseData;
  error?: string;
}

export interface FoodSearchItem {
  id: string;
  name: string;
  category?: string | null;
  display_name?: string;
  quantity?: string | null;
  source?: string | null;
}

interface FoodSearchResponse {
  success: boolean;
  data?: FoodSearchItem[];
  error?: string;
}

export interface UserDictionaryEntry {
  user_id: string;
  phrase: string;
  canonical_food_id?: string | null;
  canonical_food_name?: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserDictionaryUpsertPayload {
  userId: string;
  phrase: string;
  canonicalFoodId: string;
  canonicalFoodName?: string;
}

export interface PredictiveCandidateResponse {
  ok: boolean;
  suggest?: boolean;
  food_id?: string;
  name?: string;
  reason?: string;
  slot?: number;
  error?: string;
}

class BackendApiService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      config => {
        if (__DEV__) {
          const method = config.method?.toUpperCase() ?? 'GET';
          const base = config.baseURL ?? '';
          const url = config.url ?? '';
          console.log(`[BackendApiService] ${method} ${base}${url}`);
        }
        return config;
      },
      error => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        if (__DEV__) {
          console.error(
            '[BackendApiService] API request failed:',
            error.message
          );
        }
        return Promise.reject(error);
      }
    );
  }

  private logError(context: string, error: unknown): void {
    console.error(context, error);
  }

  private extractServerErrorMessage(error: unknown): string | undefined {
    if (!axios.isAxiosError(error)) {
      return undefined;
    }

    const data = error.response?.data as
      | {
          error?: string;
          message?: string;
        }
      | undefined;

    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }

    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }

    return undefined;
  }

  private normalizeError(error: unknown, fallbackMessage: string): Error {
    const serverMessage = this.extractServerErrorMessage(error);
    if (serverMessage) {
      return new Error(serverMessage);
    }

    if (axios.isAxiosError(error) && error.message) {
      return new Error(error.message);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(fallbackMessage);
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
      const response = await this.client.get<AirQualityApiResponse>(
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
      this.logError('Failed to fetch air quality data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }

        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
          throw new Error(
            'Unable to connect to the backend service. Please check your connection.'
          );
        }

        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please try again.');
        }
      }

      throw this.normalizeError(
        error,
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
      const response = await this.client.get<AirQualityApiResponse>(
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
      this.logError('Failed to fetch AQICN air quality data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw this.normalizeError(
        error,
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
      const response = await this.client.get<AirQualityApiResponse>(
        `/air-quality/aqicn/station/${stationId}`
      );

      return response.data;
    } catch (error) {
      this.logError('Failed to fetch AQICN station data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw this.normalizeError(
        error,
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
      const params: { latitude: number; longitude: number; radius?: number } = {
        latitude,
        longitude,
      };
      if (radius) params.radius = radius;

      const response = await this.client.get('/air-quality/aqicn/search', {
        params,
      });

      return response.data;
    } catch (error) {
      this.logError('Failed to search AQICN stations:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }

      throw this.normalizeError(
        error,
        'An unexpected error occurred while searching AQICN stations.'
      );
    }
  }

  /**
   * Clear AQICN cache (development only)
   */
  async clearAQICNCache(): Promise<void> {
    try {
      await this.client.post('/air-quality/aqicn/clear-cache');
    } catch (error) {
      this.logError('Failed to clear AQICN cache:', error);
      throw this.normalizeError(error, 'Failed to clear AQICN cache.');
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
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      this.logError('Health check failed:', error);
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
  async getServiceStatus() {
    try {
      const response = await this.client.get('/air-quality/status');
      return response.data;
    } catch (error) {
      this.logError('Failed to get service status:', error);
      throw this.normalizeError(error, 'Failed to get service status.');
    }
  }

  async searchLocations(
    query: string,
    options?: {
      limit?: number;
      countryCodes?: string;
    }
  ): Promise<LocationSuggestion[]> {
    try {
      const response = await this.client.get<LocationAutocompleteResponse>(
        '/location/autocomplete',
        {
          params: {
            q: query,
            limit: options?.limit,
            countrycodes: options?.countryCodes,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error || 'Failed to fetch location matches.'
        );
      }

      return response.data.data;
    } catch (error) {
      this.logError('Failed to search locations:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw this.normalizeError(
        error,
        'Unable to search for locations right now.'
      );
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
      const sandbox = useSandboxStore.getState();
      if (sandbox.enabled) {
        const result = sandbox.denguePrediction
          ? JSON.parse(JSON.stringify(sandbox.denguePrediction))
          : { success: true };
        return result;
      }
      const response = await this.client.get('/dengue/predict', {
        params: { state, ...(params || {}) },
      });
      return response.data;
    } catch (error) {
      this.logError('Failed to fetch dengue prediction:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw this.normalizeError(error, 'Unable to fetch dengue prediction.');
    }
  }

  // Dengue nearby queries (live ArcGIS via backend)
  async fetchDengueHotspots(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ArcGISResponse<HotspotAttributes, PointGeometry>> {
    const sandbox = useSandboxStore.getState();
    if (sandbox.enabled) {
      if (sandbox.dengueHotspots) {
        return JSON.parse(JSON.stringify(sandbox.dengueHotspots));
      }
      return { fields: [], features: [] };
    }

    try {
      const response = await this.client.get('/dengue/hotspots', {
        params: { latitude, longitude, radius: radiusKm },
      });
      return response.data.data as ArcGISResponse<
        HotspotAttributes,
        PointGeometry
      >;
    } catch (error) {
      this.logError('Failed to fetch dengue hotspots:', error);
      throw this.normalizeError(error, 'Unable to fetch dengue hotspots.');
    }
  }

  async fetchDengueOutbreaks(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ArcGISResponse<OutbreakAttributes, PolygonGeometry>> {
    const sandbox = useSandboxStore.getState();
    if (sandbox.enabled) {
      if (sandbox.dengueOutbreaks) {
        return JSON.parse(JSON.stringify(sandbox.dengueOutbreaks));
      }
      return { fields: [], features: [] };
    }

    try {
      const response = await this.client.get('/dengue/outbreaks', {
        params: { latitude, longitude, radius: radiusKm },
      });
      return response.data.data as ArcGISResponse<
        OutbreakAttributes,
        PolygonGeometry
      >;
    } catch (error) {
      this.logError('Failed to fetch dengue outbreaks:', error);
      throw this.normalizeError(error, 'Unable to fetch dengue outbreaks.');
    }
  }

  async fetchDengueStateStats(): Promise<ArcGISResponse<StateAttributes>> {
    try {
      const response = await this.client.get('/dengue/states');
      return response.data.data as ArcGISResponse<StateAttributes>;
    } catch (error) {
      this.logError('Failed to fetch dengue state stats:', error);
      throw this.normalizeError(error, 'Unable to fetch dengue state stats.');
    }
  }

  /**
   * Clear cache (development only)
   */
  async clearCache(): Promise<void> {
    try {
      await this.client.post('/air-quality/clear-cache');
    } catch (error) {
      this.logError('Failed to clear cache:', error);
      throw this.normalizeError(error, 'Failed to clear cache.');
    }
  }

  async fetchSmartPromptSuggestion(
    now: number = Date.now()
  ): Promise<SmartPromptSuggestion | null> {
    try {
      const { data } = await this.client.get<SmartPromptResponse>(
        '/personalization/predict',
        {
          params: { now },
        }
      );

      if (!data?.ok) {
        if (data?.ask) {
          return null;
        }
        throw new Error(
          data?.error || 'Smart prompt suggestion not available at the moment.'
        );
      }

      return data.suggestion ?? null;
    } catch (error) {
      this.logError('Failed to fetch smart prompt suggestion:', error);
      throw this.normalizeError(
        error,
        'Unable to fetch smart prompt suggestion right now.'
      );
    }
  }

  async searchFoods(
    query: string,
    limit: number = 5
  ): Promise<FoodSearchItem[]> {
    try {
      const { data } = await this.client.get<FoodSearchResponse>(
        '/food/search',
        {
          params: { q: query, limit },
        }
      );

      if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.error || 'Food search failed.');
      }

      return data.data;
    } catch (error) {
      this.logError('Failed to search foods:', error);
      throw this.normalizeError(error, 'Unable to search foods right now.');
    }
  }

  async extractMeal(
    payload: ExtractMealRequestPayload
  ): Promise<ExtractMealResponseData> {
    try {
      const { data } = await this.client.post<ExtractMealApiResponse>(
        '/ai/extract',
        payload,
        {
          // Set timeout to 35 seconds
          timeout: 60_000,
        }
      );

      if (!data?.ok || !data?.data) {
        throw new Error(data?.error || 'Meal extraction failed.');
      }

      return data.data;
    } catch (error) {
      this.logError('Failed to extract meal:', error);
      throw this.normalizeError(error, 'Unable to extract meal right now.');
    }
  }

  async analyzeFood(
    payload: AnalyzeFoodRequestPayload
  ): Promise<AnalyzeFoodResponseData> {
    try {
      const { data } = await this.client.post<AnalyzeMealApiResponse>(
        '/food/analyze',
        payload
      );

      if (!data?.ok || !data?.data) {
        throw new Error(data?.error || 'Analyze failed');
      }

      return data.data;
    } catch (error) {
      this.logError('Failed to analyze meal:', error);
      throw this.normalizeError(error, 'Unable to analyze meal right now.');
    }
  }
}

export const backendApiService = new BackendApiService();

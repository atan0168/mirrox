// OpenAQ API interfaces (existing)
export interface AirQualityMeasurement {
  datetime: {
    utc: string;
    local: string;
  };
  value: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sensorsId: number;
  locationsId: number;
}

// AQICN API interfaces
export interface AQICNResponse {
  status: string;
  data: AQICNData;
}

export interface AQICNData {
  aqi: number;
  idx: number;
  attributions: Array<{
    url: string;
    name: string;
    logo?: string;
  }>;
  city: {
    geo: [number, number]; // [latitude, longitude]
    name: string;
    url: string;
  };
  dominentpol: string;
  iaqi: {
    [pollutant: string]: {
      v: number;
    };
  };
  time: {
    s: string; // ISO timestamp
    tz: string; // timezone
    v: number; // unix timestamp
  };
  forecast?: {
    daily: {
      o3: Array<ForecastMeasurement>;
      pm10: Array<ForecastMeasurement>;
      pm25: Array<ForecastMeasurement>;
      uvi?: Array<ForecastMeasurement>;
    };
  };
}

export interface ForecastMeasurement {
  day: string;
  avg: number;
  min: number;
  max: number;
}

export interface AirQualityLocation {
  id: number;
  name: string;
  locality: string | null;
  timezone: string;
  country: {
    id: number;
    code: string;
    name: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sensors: Array<{
    id: number;
    name: string;
    parameter: {
      id: number;
      name: string;
      units: string;
      displayName: string;
    };
  }>;
  distance?: number;
}

export interface AirQualityData {
  location: AirQualityLocation;
  measurements: AirQualityMeasurement[];
  // Computed values for easier use
  aqi?: number;
  primaryPollutant?: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  co?: number;
  o3?: number;
}

// Unified air quality data structure for API responses
export interface UnifiedAirQualityData {
  source: 'openaq';
  stationId: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
    state?: string;
    country: string;
    category?: string; // Urban, Rural, Industrial, etc.
  };
  datetime: string; // ISO string for API responses
  api: number | null; // Air Pollutant Index
  classification: string | null; // Good, Moderate, Unhealthy, etc.
  primaryPollutant: string | null;

  // Pollutant concentrations
  pollutants: {
    pm25: {
      concentration: number | null;
      subIndex: number | null;
      avg24h: number | null;
      units: string;
    };
    pm10: {
      concentration: number | null;
      subIndex: number | null;
      avg24h: number | null;
      units: string;
    };
    so2: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
      units: string;
    };
    no2: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
      units: string;
    };
    o3: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
      units: string;
    };
    co: {
      concentration: number | null;
      subIndex: number | null;
      avg8h: number | null;
      units: string;
    };
  };

  // Weather data (if available)
  weather?: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    solarRadiation: number | null;
  };

  // Data quality info
  dataQuality: {
    hasQualityFlags: boolean;
    completeness: Record<string, number>; // Percentage completeness for each parameter
    flags: Record<string, string>; // Quality control flags
  };

  // Health advice
  healthAdvice: string;
  colorCode: string; // Hex color for the classification
}

// Historical data for trends
export interface HistoricalReading {
  stationId: string;
  timestamp: string; // ISO string
  api: number | null;
  classification: string | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
}

export interface TrendData {
  stationId: string;
  parameter: string;
  timeRange: {
    from: string;
    to: string;
    hours: number;
  };
  data: Array<{
    timestamp: string;
    value: number | null;
  }>;
  statistics: {
    average: number | null;
    min: number | null;
    max: number | null;
    trend: 'improving' | 'worsening' | 'stable' | 'insufficient_data';
    dataPoints: number;
  };
}

export interface OpenAQResponse<T> {
  meta: {
    name: string;
    website: string;
    page: number;
    limit: number;
    found: string | number;
  };
  results: T[];
}

// API Response interfaces
export interface AirQualityApiResponse {
  success: boolean;
  data?:
    | AirQualityData
    | UnifiedAirQualityData
    | UnifiedAirQualityData[]
    | StationSearchResult[];
  error?: string;
  cached?: boolean;
  cacheAge?: number | undefined;
}

export interface StationSearchResult {
  name: string;
  stationId: string;
  distance: number;
  aqi: number;
}

export interface ServiceStatusResponse {
  success: boolean;
  data: {
    cache: {
      size: number;
      keys: string[];
      breakdown?: {
        aqicn: number;
        openaq: number;
        other: number;
      };
    };
    rateLimit: any;
    uptime: number;
    timestamp: string;
    services?: {
      aqicn: string;
      openaq: string;
    };
  };
}

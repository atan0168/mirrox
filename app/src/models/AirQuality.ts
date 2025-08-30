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
export interface AQICNData {
  aqi: number;
  idx: number;
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
  attributions?: Array<{
    url: string;
    name: string;
    logo?: string;
  }>;
  // Additional AQICN specific fields that might be returned
  classification?: string;
  colorCode?: string;
  healthAdvice?: string;
  source?: 'aqicn';
  timestamp?: string;
  stationUrl?: string;
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
}

// Unified air quality data structure
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
  datetime: Date;
  api: number | null; // Air Pollutant Index
  classification: string | null; // Good, Moderate, Unhealthy, etc.
  primaryPollutant: string | null;

  // Pollutant concentrations
  pollutants: {
    pm25: {
      concentration: number | null;
      subIndex: number | null;
      avg24h: number | null;
    };
    pm10: {
      concentration: number | null;
      subIndex: number | null;
      avg24h: number | null;
    };
    so2: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
    };
    no2: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
    };
    o3: {
      concentration: number | null;
      subIndex: number | null;
      avg1h: number | null;
    };
    co: {
      concentration: number | null;
      subIndex: number | null;
      avg8h: number | null;
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
}

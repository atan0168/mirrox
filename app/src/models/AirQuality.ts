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
  source?: 'openaq' | 'aqicn' | 'myeqms';
  timestamp?: string;
  stationUrl?: string;
  attributions?: Array<{
    url: string;
    name: string;
    logo?: string;
  }>;
}

// MyEQMS API interfaces (Malaysian government data)
export interface MyEQMSStation {
  STATION_ID: string;
  DATETIME: number | null; // Unix timestamp
  API: number | null;
  API_PM10: number | null;
  CLASS: string | null; // "Good", "Moderate", "Unhealthy", etc.

  // Sub-index values for each pollutant
  SI_SO2: number | null;
  SI_NO2: number | null;
  SI_O3: number | null;
  SI_CO: number | null;
  SI_PM10: number | null;
  SI_PM25: number | null;

  // Weather data
  SOLAR_RADIATION: number | null;
  TEMPERATURE: number | null;
  WIND_DIRECTION: number | null;
  WIND_SPEED: number | null;
  RELATIVE_HUMIDITY: number | null;

  // Pollutant concentrations (instantaneous)
  SO2_CONC: number | null;
  NO2_CONC: number | null;
  NOX_CONC: number | null;
  NO_CONC: number | null;
  O3_CONC: number | null;
  CO_CONC: number | null;
  PM10_CONC: number | null;
  PM25_CONC: number | null;

  // Averaged concentrations
  SO2_1H_AVG: number | null;
  NO2_1H_AVG: number | null;
  O3_1H_AVG: number | null;
  CO_8H_AVG: number | null;
  PM10_24H_AVG: number | null;
  PM25_24H_AVG: number | null;

  // Dominant pollutant info
  PARAM_SELECTED: string | null;
  PARAM_SYMBOL: string | null;
  PARAM_SYMBOL_PM10: string | null;

  // Location data
  LONGITUDE: number;
  LATITUDE: number;
  STATION_LOCATION: string;
  PLACE: string;
  LOT_INFO: string | null;
  STATION_CATEGORY: string; // "Urban", "Sub Urban", "Rural", "Industry", "Background"
  STATE_NAME: string;
  REGION_NAME: string;
  STATE_ID: string;
  REGION_ID: string;

  // Technical info
  TELECOMMUNICATION_TYPE: string | null;
  OP_NAME: string | null;
  OP_PHONE: string | null;
  ENG_NAME: string | null;
  ENG_PHONE: string | null;
  OP_EMAIL: string | null;
  ENG_EMAIL: string | null;

  // Data quality flags
  SO2H_FLAG: string | null;
  NO2H_FLAG: string | null;
  O3H_FLAG: string | null;
  COH_FLAG: string | null;
  PM25H_FLAG: string | null;
  PM10H_FLAG: string | null;
  SOLARH_FLAG: string | null;
  TEMPH_FLAG: string | null;
  WSH_FLAG: string | null;
  WDH_FLAG: string | null;
  HUMIDITYH_FLAG: string | null;

  FLAG_SO2AVG: string | null;
  FLAG_NO2AVG: string | null;
  FLAG_O3AVG: string | null;
  FLAG_COAVG: string | null;
  FLAG_PM25AVG: string | null;
  FLAG_PM10AVG: string | null;

  // Data completeness percentages
  PERC_PM10AVG: number | null;
  PERC_PM25AVG: number | null;
  PERC_COAVG: number | null;
  PERC_O3AVG: number | null;
  PERC_NO2AVG: number | null;
  PERC_SO2AVG: number | null;

  CLASS_PM10: string | null;
  PARAM_SELECTED_PM10: string | null;
  STATION_STATUS: number;
  ALERT_STATUS: number;
  TAC_PASS: number | null;
  SORT_BY_STATE_NAME: number;
  ESRI_OID: number;
}

export interface MyEQMSResponse {
  displayFieldName: string;
  fieldAliases: Record<string, string>;
  fields: Array<{
    name: string;
    type: string;
    alias: string;
    length?: number;
  }>;
  features: Array<{
    attributes: MyEQMSStation;
  }>;
}

// Unified air quality data structure
export interface UnifiedAirQualityData {
  source: 'openaq' | 'myeqms';
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

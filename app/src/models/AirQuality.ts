export interface AirQualityData {
  aqi: number;
  primaryPollutant: string;
  stationName?: string; // Optional context
}

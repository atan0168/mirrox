import axios, { AxiosResponse } from "axios";
import {
  MyEQMSResponse,
  MyEQMSStation,
  UnifiedAirQualityData,
  HistoricalReading,
  TrendData,
} from "../models/AirQuality";
import { cacheService } from "./CacheService";

interface MyEQMSServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTimeMs: number;
}

export class MyEQMSService {
  private static instance: MyEQMSService;
  private config: MyEQMSServiceConfig;

  // In-memory storage for historical data (in production, use a real database)
  private historicalData: Map<string, HistoricalReading[]> = new Map();
  private readonly MAX_HISTORICAL_RECORDS = 7 * 24; // 1 week of hourly data

  private constructor() {
    this.config = {
      baseUrl:
        "https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/CAQM_MCAQM_Current_Reading/MapServer/0/query",
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTimeMs: 60 * 60 * 1000, // 1 hour cache
    };

    // Schedule periodic data collection
    this.scheduleDataCollection();
  }

  public static getInstance(): MyEQMSService {
    if (!MyEQMSService.instance) {
      MyEQMSService.instance = new MyEQMSService();
    }
    return MyEQMSService.instance;
  }

  /**
   * Fetch all MyEQMS air quality stations data
   */
  public async fetchAllStations(): Promise<MyEQMSResponse> {
    const cacheKey = "myeqms_all_stations";

    // Check cache first
    const cached = cacheService.get<MyEQMSResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = {
        f: "json",
        outFields: "*",
        returnGeometry: "false",
        spatialRel: "esriSpatialRelIntersects",
        where: "1=1",
      };

      const response: AxiosResponse<MyEQMSResponse> =
        await this.makeRequest(params);
      const data = response.data;

      // Cache the response
      cacheService.set(cacheKey, data, this.config.cacheTimeMs);

      // Store historical data
      await this.storeHistoricalData(data);

      return data;
    } catch (error) {
      console.error("Error fetching MyEQMS data:", error);
      throw new Error(
        `Failed to fetch MyEQMS data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get stations by state
   */
  public async getStationsByState(
    stateName: string,
  ): Promise<UnifiedAirQualityData[]> {
    const data = await this.fetchAllStations();
    const stations = data.features
      .map((feature) => feature.attributes)
      .filter((station) =>
        station.STATE_NAME.toLowerCase().includes(stateName.toLowerCase()),
      );

    return stations.map((station) => this.convertToUnifiedFormat(station));
  }

  /**
   * Get stations by location (within radius)
   */
  public async getStationsByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
  ): Promise<UnifiedAirQualityData[]> {
    const data = await this.fetchAllStations();

    const nearbyStations = data.features
      .map((feature) => feature.attributes)
      .filter((station) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          station.LATITUDE,
          station.LONGITUDE,
        );
        return distance <= radiusKm;
      })
      .sort((a, b) => {
        const distA = this.calculateDistance(
          latitude,
          longitude,
          a.LATITUDE,
          a.LONGITUDE,
        );
        const distB = this.calculateDistance(
          latitude,
          longitude,
          b.LATITUDE,
          b.LONGITUDE,
        );
        return distA - distB;
      });

    return nearbyStations.map((station) =>
      this.convertToUnifiedFormat(station),
    );
  }

  /**
   * Get station by ID
   */
  public async getStationById(
    stationId: string,
  ): Promise<UnifiedAirQualityData | null> {
    const data = await this.fetchAllStations();
    const station = data.features
      .map((feature) => feature.attributes)
      .find((station) => station.STATION_ID === stationId);

    return station ? this.convertToUnifiedFormat(station) : null;
  }

  /**
   * Get all active stations with current data
   */
  public async getAllActiveStations(): Promise<UnifiedAirQualityData[]> {
    const data = await this.fetchAllStations();
    const activeStations = data.features
      .map((feature) => feature.attributes)
      .filter(
        (station) => station.STATION_STATUS === 1 && station.API !== null,
      );

    return activeStations.map((station) =>
      this.convertToUnifiedFormat(station),
    );
  }

  /**
   * Get stations by region
   */
  public async getStationsByRegion(
    regionName: string,
  ): Promise<UnifiedAirQualityData[]> {
    const data = await this.fetchAllStations();
    const stations = data.features
      .map((feature) => feature.attributes)
      .filter((station) =>
        station.REGION_NAME.toLowerCase().includes(regionName.toLowerCase()),
      );

    return stations.map((station) => this.convertToUnifiedFormat(station));
  }

  /**
   * Get trend data for a specific station
   */
  public async getTrendData(
    stationId: string,
    parameter: "api" | "pm25" | "pm10" | "temperature" | "humidity",
    hoursBack: number = 24,
  ): Promise<TrendData> {
    const readings = this.historicalData.get(stationId) || [];
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const recentReadings = readings
      .filter((reading) => new Date(reading.timestamp) >= cutoffTime)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    const data = recentReadings.map((reading) => ({
      timestamp: reading.timestamp,
      value: reading[parameter as keyof HistoricalReading] as number | null,
    }));

    const validValues = data
      .map((d) => d.value)
      .filter((v) => v !== null) as number[];

    let statistics = {
      average: null as number | null,
      min: null as number | null,
      max: null as number | null,
      trend: "insufficient_data" as
        | "improving"
        | "worsening"
        | "stable"
        | "insufficient_data",
      dataPoints: validValues.length,
    };

    if (validValues.length > 0) {
      statistics.average = Math.round(
        validValues.reduce((sum, val) => sum + val, 0) / validValues.length,
      );
      statistics.min = Math.min(...validValues);
      statistics.max = Math.max(...validValues);

      // Calculate trend
      if (validValues.length >= 4) {
        const halfLength = Math.floor(validValues.length / 2);
        const recentHalf = validValues.slice(-halfLength);
        const olderHalf = validValues.slice(0, halfLength);

        const recentAvg =
          recentHalf.reduce((sum, val) => sum + val, 0) / recentHalf.length;
        const olderAvg =
          olderHalf.reduce((sum, val) => sum + val, 0) / olderHalf.length;

        const difference = recentAvg - olderAvg;

        if (Math.abs(difference) < 5) {
          statistics.trend = "stable";
        } else if (difference < 0) {
          statistics.trend = "improving"; // Lower values are generally better for pollutants
        } else {
          statistics.trend = "worsening";
        }
      }
    }

    return {
      stationId,
      parameter,
      timeRange: {
        from: cutoffTime.toISOString(),
        to: new Date().toISOString(),
        hours: hoursBack,
      },
      data,
      statistics,
    };
  }

  /**
   * Convert MyEQMS station data to unified format
   */
  public convertToUnifiedFormat(station: MyEQMSStation): UnifiedAirQualityData {
    return {
      source: "myeqms",
      stationId: station.STATION_ID,
      location: {
        latitude: station.LATITUDE,
        longitude: station.LONGITUDE,
        name: station.STATION_LOCATION,
        state: station.STATE_NAME,
        country: "Malaysia",
        category: station.STATION_CATEGORY,
      },
      datetime: station.DATETIME
        ? new Date(station.DATETIME).toISOString()
        : new Date().toISOString(),
      api: station.API,
      classification: station.CLASS,
      primaryPollutant: station.PARAM_SELECTED,

      pollutants: {
        pm25: {
          concentration: station.PM25_CONC,
          subIndex: station.SI_PM25,
          avg24h: station.PM25_24H_AVG,
          units: "µg/m³",
        },
        pm10: {
          concentration: station.PM10_CONC,
          subIndex: station.SI_PM10,
          avg24h: station.PM10_24H_AVG,
          units: "µg/m³",
        },
        so2: {
          concentration: station.SO2_CONC,
          subIndex: station.SI_SO2,
          avg1h: station.SO2_1H_AVG,
          units: "µg/m³",
        },
        no2: {
          concentration: station.NO2_CONC,
          subIndex: station.SI_NO2,
          avg1h: station.NO2_1H_AVG,
          units: "µg/m³",
        },
        o3: {
          concentration: station.O3_CONC,
          subIndex: station.SI_O3,
          avg1h: station.O3_1H_AVG,
          units: "µg/m³",
        },
        co: {
          concentration: station.CO_CONC,
          subIndex: station.SI_CO,
          avg8h: station.CO_8H_AVG,
          units: "mg/m³",
        },
      },

      weather: {
        temperature: station.TEMPERATURE,
        humidity: station.RELATIVE_HUMIDITY,
        windSpeed: station.WIND_SPEED,
        windDirection: station.WIND_DIRECTION,
        solarRadiation: station.SOLAR_RADIATION,
      },

      dataQuality: {
        hasQualityFlags: true,
        completeness: {
          pm25: station.PERC_PM25AVG || 0,
          pm10: station.PERC_PM10AVG || 0,
          co: station.PERC_COAVG || 0,
          o3: station.PERC_O3AVG || 0,
          no2: station.PERC_NO2AVG || 0,
          so2: station.PERC_SO2AVG || 0,
        },
        flags: {
          so2: station.SO2H_FLAG || "",
          no2: station.NO2H_FLAG || "",
          o3: station.O3H_FLAG || "",
          co: station.COH_FLAG || "",
          pm25: station.PM25H_FLAG || "",
          pm10: station.PM10H_FLAG || "",
        },
      },

      healthAdvice: this.getHealthAdvice(station.API),
      colorCode: this.getClassificationColor(station.API),
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    params: Record<string, string>,
    attempt = 1,
  ): Promise<AxiosResponse<MyEQMSResponse>> {
    try {
      const response = await axios.get(this.config.baseUrl, {
        params,
        timeout: this.config.timeout,
        headers: {
          Accept: "*/*",
          "Cache-Control": "no-cache",
          "User-Agent": "DigitalTwin-Backend/1.0.0",
        },
      });

      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.warn(`MyEQMS request attempt ${attempt} failed, retrying...`);
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(params, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Store historical data for trend analysis
   */
  private async storeHistoricalData(data: MyEQMSResponse): Promise<void> {
    const timestamp = new Date().toISOString();

    for (const feature of data.features) {
      const station = feature.attributes;

      if (!station.STATION_ID || station.API === null) continue;

      const reading: HistoricalReading = {
        stationId: station.STATION_ID,
        timestamp,
        api: station.API,
        classification: station.CLASS,
        pm25: station.PM25_CONC,
        pm10: station.PM10_CONC,
        temperature: station.TEMPERATURE,
        humidity: station.RELATIVE_HUMIDITY,
      };

      const stationReadings = this.historicalData.get(station.STATION_ID) || [];
      stationReadings.push(reading);

      // Keep only recent readings
      const recentReadings = stationReadings
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, this.MAX_HISTORICAL_RECORDS);

      this.historicalData.set(station.STATION_ID, recentReadings);
    }
  }

  /**
   * Schedule periodic data collection for trend analysis
   */
  private scheduleDataCollection(): void {
    // Collect data every hour
    setInterval(
      async () => {
        try {
          console.log("Collecting MyEQMS data for historical trends...");
          await this.fetchAllStations();
        } catch (error) {
          console.error("Error in scheduled data collection:", error);
        }
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  /**
   * Get Malaysian air quality classification color
   */
  private getClassificationColor(api: number | null): string {
    if (!api) return "#9CA3AF"; // Gray for no data

    if (api <= 50) return "#10B981"; // Green - Good
    if (api <= 100) return "#F59E0B"; // Yellow - Moderate
    if (api <= 200) return "#EF4444"; // Red - Unhealthy
    if (api <= 300) return "#7C3AED"; // Purple - Very Unhealthy
    return "#991B1B"; // Dark Red - Hazardous
  }

  /**
   * Get health advice based on API level
   */
  private getHealthAdvice(api: number | null): string {
    if (!api) return "No data available";

    if (api <= 50) {
      return "Air quality is satisfactory. Enjoy outdoor activities!";
    }
    if (api <= 100) {
      return "Air quality is acceptable. Sensitive individuals should consider limiting outdoor exertion.";
    }
    if (api <= 200) {
      return "Unhealthy air quality. Everyone should reduce outdoor activities, especially sensitive groups.";
    }
    if (api <= 300) {
      return "Very unhealthy air quality. Avoid outdoor activities. Use air purifiers indoors.";
    }
    return "Hazardous air quality. Stay indoors and avoid all outdoor activities.";
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default MyEQMSService;

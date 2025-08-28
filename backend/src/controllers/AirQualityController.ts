import { Request, Response } from 'express';
import { apiService } from '../services/ApiService';
import { aqicnService } from '../services/AQICNService';
import { MyEQMSService } from '../services/MyEQMSService';
import {
  AirQualityApiResponse,
  ServiceStatusResponse,
} from '../models/AirQuality';

export class AirQualityController {
  private myeqmsService: MyEQMSService;

  constructor() {
    this.myeqmsService = MyEQMSService.getInstance();
  }
  /**
   * Get air quality data for given coordinates
   * Uses AQICN as the primary source with OpenAQ as fallback
   */
  async getAirQuality(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, source } = req.query;

      // Validate input
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required parameters',
        } as AirQualityApiResponse);
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude or longitude values',
        } as AirQualityApiResponse);
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          success: false,
          error:
            'Latitude must be between -90 and 90, longitude must be between -180 and 180',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching air quality for coordinates: ${lat}, ${lon}`);

      let data, cached, cacheAge;

      // Allow explicit source selection
      if (source === 'openaq') {
        cached = apiService.hasCachedData(lat, lon);
        cacheAge = apiService.getCacheAge(lat, lon);
        data = await apiService.fetchAirQuality(lat, lon);
      } else {
        // Default to AQICN (primary source)
        try {
          cached = aqicnService.hasCachedData(lat, lon);
          cacheAge = aqicnService.getCacheAge(lat, lon);
          data = await aqicnService.fetchAirQualityByCoordinates(lat, lon);
        } catch (error) {
          console.warn('AQICN failed, falling back to OpenAQ:', error);
          // Fallback to OpenAQ if AQICN fails
          cached = apiService.hasCachedData(lat, lon);
          cacheAge = apiService.getCacheAge(lat, lon);
          data = await apiService.fetchAirQuality(lat, lon);
        }
      }

      const response: AirQualityApiResponse = {
        success: true,
        data,
        cached,
        cacheAge: cacheAge || undefined,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching air quality data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const openaqStatus = apiService.getServiceStatus();
      const cacheStats = openaqStatus.cache;

      // Get AQICN specific cache stats
      const aqicnKeys = cacheStats.keys.filter(key => key.startsWith('aqicn_'));
      const openaqKeys = cacheStats.keys.filter(
        key => !key.startsWith('aqicn_') && !key.startsWith('myeqms_')
      );
      const myeqmsKeys = cacheStats.keys.filter(key =>
        key.startsWith('myeqms_')
      );

      const response: ServiceStatusResponse = {
        success: true,
        data: {
          cache: {
            size: cacheStats.size,
            keys: cacheStats.keys,
            breakdown: {
              aqicn: aqicnKeys.length,
              openaq: openaqKeys.length,
              myeqms: myeqmsKeys.length,
              other:
                cacheStats.size -
                aqicnKeys.length -
                openaqKeys.length -
                myeqmsKeys.length,
            },
          },
          rateLimit: openaqStatus.rateLimit,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          services: {
            aqicn: 'enabled',
            openaq: 'enabled',
            myeqms: 'enabled',
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting service status:', error);

      res.status(500).json({
        success: false,
        data: {
          cache: {
            size: 0,
            keys: [],
            breakdown: { aqicn: 0, openaq: 0, myeqms: 0, other: 0 },
          },
          rateLimit: null,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          services: {
            aqicn: 'error',
            openaq: 'error',
            myeqms: 'error',
          },
        },
      } as ServiceStatusResponse);
    }
  }

  /**
   * Clear cache manually
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      apiService.clearCache();

      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing cache:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  // AQICN Endpoints

  /**
   * Get air quality data from AQICN by coordinates
   */
  async getAQICNAirQuality(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude } = req.query;

      // Validate input
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required parameters',
        } as AirQualityApiResponse);
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude or longitude values',
        } as AirQualityApiResponse);
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          success: false,
          error:
            'Latitude must be between -90 and 90, longitude must be between -180 and 180',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching AQICN air quality for coordinates: ${lat}, ${lon}`);

      // Check if we have cached data
      const cached = aqicnService.hasCachedData(lat, lon);
      const cacheAge = aqicnService.getCacheAge(lat, lon);

      // Fetch air quality data from AQICN
      const data = await aqicnService.fetchAirQualityByCoordinates(lat, lon);

      const response: AirQualityApiResponse = {
        success: true,
        data,
        cached,
        cacheAge: cacheAge || undefined,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching AQICN air quality data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get air quality data from AQICN by station ID
   */
  async getAQICNStationData(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;

      if (!stationId) {
        res.status(400).json({
          success: false,
          error: 'Station ID parameter is required',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching AQICN air quality for station: ${stationId}`);

      const data = await aqicnService.fetchAirQualityByStationId(stationId);

      res.json({
        success: true,
        data,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error('Error fetching AQICN station data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Search for AQICN stations near coordinates
   */
  async searchAQICNStations(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius } = req.query;

      // Validate input
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required parameters',
        } as AirQualityApiResponse);
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const radiusKm = radius ? parseFloat(radius as string) : 50;

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude or longitude values',
        } as AirQualityApiResponse);
        return;
      }

      console.log(
        `Searching AQICN stations for coordinates: ${lat}, ${lon}, radius: ${radiusKm}km`
      );

      const stations = await aqicnService.searchStations(lat, lon, radiusKm);

      res.json({
        success: true,
        data: stations,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error('Error searching AQICN stations:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Clear AQICN cache manually
   */
  async clearAQICNCache(req: Request, res: Response): Promise<void> {
    try {
      aqicnService.clearCache();

      res.json({
        success: true,
        message: 'AQICN cache cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing AQICN cache:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to clear AQICN cache',
      });
    }
  }

  // MyEQMS Endpoints

  /**
   * Get Malaysian air quality data by location
   */
  async getMalaysianAirQuality(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius } = req.query;

      // Validate input
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required parameters',
        } as AirQualityApiResponse);
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const radiusKm = radius ? parseFloat(radius as string) : 50;

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude or longitude values',
        } as AirQualityApiResponse);
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          success: false,
          error:
            'Latitude must be between -90 and 90, longitude must be between -180 and 180',
        } as AirQualityApiResponse);
        return;
      }

      console.log(
        `Fetching Malaysian air quality for coordinates: ${lat}, ${lon}, radius: ${radiusKm}km`
      );

      const stations = await this.myeqmsService.getStationsByLocation(
        lat,
        lon,
        radiusKm
      );

      res.json({
        success: true,
        data: stations,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error('Error fetching Malaysian air quality data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get Malaysian air quality data by state
   */
  async getMalaysianAirQualityByState(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { state } = req.params;

      if (!state) {
        res.status(400).json({
          success: false,
          error: 'State parameter is required',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching Malaysian air quality for state: ${state}`);

      const stations = await this.myeqmsService.getStationsByState(state);

      res.json({
        success: true,
        data: stations,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error(
        'Error fetching Malaysian air quality data by state:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get specific Malaysian air quality station data
   */
  async getMalaysianStationData(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;

      if (!stationId) {
        res.status(400).json({
          success: false,
          error: 'Station ID parameter is required',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching Malaysian air quality for station: ${stationId}`);

      const station = await this.myeqmsService.getStationById(stationId);

      if (!station) {
        res.status(404).json({
          success: false,
          error: 'Station not found',
        } as AirQualityApiResponse);
        return;
      }

      res.json({
        success: true,
        data: station,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error('Error fetching Malaysian station data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get all active Malaysian air quality stations
   */
  async getAllMalaysianStations(req: Request, res: Response): Promise<void> {
    try {
      console.log('Fetching all Malaysian air quality stations');

      const stations = await this.myeqmsService.getAllActiveStations();

      res.json({
        success: true,
        data: stations,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error('Error fetching all Malaysian stations:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get Malaysian air quality data by region
   */
  async getMalaysianAirQualityByRegion(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { region } = req.params;

      if (!region) {
        res.status(400).json({
          success: false,
          error: 'Region parameter is required',
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching Malaysian air quality for region: ${region}`);

      const stations = await this.myeqmsService.getStationsByRegion(region);

      res.json({
        success: true,
        data: stations,
        cached: false,
      } as AirQualityApiResponse);
    } catch (error) {
      console.error(
        'Error fetching Malaysian air quality data by region:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as AirQualityApiResponse);
    }
  }

  /**
   * Get trend data for a Malaysian air quality station
   */
  async getMalaysianStationTrend(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;
      const { parameter, hours } = req.query;

      if (!stationId) {
        res.status(400).json({
          success: false,
          error: 'Station ID parameter is required',
        });
        return;
      }

      const param = (parameter as string) || 'api';
      const hoursBack = hours ? parseInt(hours as string) : 24;

      if (!['api', 'pm25', 'pm10', 'temperature', 'humidity'].includes(param)) {
        res.status(400).json({
          success: false,
          error:
            'Parameter must be one of: api, pm25, pm10, temperature, humidity',
        });
        return;
      }

      if (isNaN(hoursBack) || hoursBack < 1 || hoursBack > 168) {
        res.status(400).json({
          success: false,
          error: 'Hours must be a number between 1 and 168 (1 week)',
        });
        return;
      }

      console.log(
        `Fetching trend data for station ${stationId}, parameter: ${param}, hours: ${hoursBack}`
      );

      const trendData = await this.myeqmsService.getTrendData(
        stationId,
        param as 'api' | 'pm25' | 'pm10' | 'temperature' | 'humidity',
        hoursBack
      );

      res.json({
        success: true,
        data: trendData,
        cached: false,
      });
    } catch (error) {
      console.error('Error fetching Malaysian station trend data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}

export const airQualityController = new AirQualityController();

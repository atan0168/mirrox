import { Request, Response } from 'express';
import { apiService } from '../services/ApiService';
import { aqicnService } from '../services/AQICNService';
import {
  AirQualityApiResponse,
  ServiceStatusResponse,
} from '../models/AirQuality';

export class AirQualityController {
  constructor() {
    // No services need initialization
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
        key => !key.startsWith('aqicn_')
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
              other:
                cacheStats.size -
                aqicnKeys.length -
                openaqKeys.length,
            },
          },
          rateLimit: openaqStatus.rateLimit,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          services: {
            aqicn: 'enabled',
            openaq: 'enabled',
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
            breakdown: { aqicn: 0, openaq: 0, other: 0 },
          },
          rateLimit: null,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          services: {
            aqicn: 'error',
            openaq: 'error',
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
}

export const airQualityController = new AirQualityController();

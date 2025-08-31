import { Request, Response } from 'express';
import { trafficService } from '../services/TrafficService';

export class TrafficController {
  /**
   * Get congestion factor for given coordinates
   * GET /api/traffic/congestion?lat=<latitude>&lng=<longitude>
   */
  public async getCongestionFactor(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lng } = req.query;

      // Validate required parameters
      if (!lat || !lng) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: lat and lng are required',
          example: '/api/traffic/congestion?lat=3.1390&lng=101.6869',
        });
        return;
      }

      // Parse and validate coordinates
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(400).json({
          success: false,
          error: 'Invalid coordinates: lat and lng must be valid numbers',
          provided: { lat, lng },
        });
        return;
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude: must be between -90 and 90',
          provided: { latitude },
        });
        return;
      }

      if (longitude < -180 || longitude > 180) {
        res.status(400).json({
          success: false,
          error: 'Invalid longitude: must be between -180 and 180',
          provided: { longitude },
        });
        return;
      }

      // Fetch congestion data
      const congestionData = await trafficService.getCongestionFactor(
        latitude,
        longitude
      );

      res.json({
        success: true,
        data: congestionData,
        thresholds: trafficService.getCongestionThresholds(),
        meta: {
          requestedCoordinates: { latitude, longitude },
          cacheAge: trafficService.getCacheAge(latitude, longitude),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error in getCongestionFactor:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get traffic service status and cache information
   * GET /api/traffic/status
   */
  public async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = trafficService.getCacheAge(0, 0); // This will return null but won't error

      res.json({
        success: true,
        service: 'TomTom Traffic Flow API',
        status: 'operational',
        thresholds: trafficService.getCongestionThresholds(),
        cache: {
          enabled: true,
          ttl: '5 minutes',
          description:
            'Traffic data is cached for 5 minutes to reduce API calls',
        },
        endpoints: {
          congestion: '/api/traffic/congestion?lat=<latitude>&lng=<longitude>',
          status: '/api/traffic/status',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in getStatus:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get service status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Clear traffic cache (for testing/debugging)
   * POST /api/traffic/cache/clear
   */
  public async clearCache(req: Request, res: Response): Promise<void> {
    try {
      trafficService.clearCache();

      res.json({
        success: true,
        message: 'Traffic cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in clearCache:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const trafficController = new TrafficController();

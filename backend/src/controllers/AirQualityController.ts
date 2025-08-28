import { Request, Response } from "express";
import { apiService } from "../services/ApiService";
import {
  AirQualityApiResponse,
  ServiceStatusResponse,
} from "../models/AirQuality";

export class AirQualityController {
  /**
   * Get air quality data for given coordinates
   */
  async getAirQuality(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude } = req.query;

      // Validate input
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: "Latitude and longitude are required parameters",
        } as AirQualityApiResponse);
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: "Invalid latitude or longitude values",
        } as AirQualityApiResponse);
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          success: false,
          error:
            "Latitude must be between -90 and 90, longitude must be between -180 and 180",
        } as AirQualityApiResponse);
        return;
      }

      console.log(`Fetching air quality for coordinates: ${lat}, ${lon}`);

      // Check if we have cached data
      const cached = apiService.hasCachedData(lat, lon);
      const cacheAge = apiService.getCacheAge(lat, lon);

      // Fetch air quality data
      const data = await apiService.fetchAirQuality(lat, lon);

      const response: AirQualityApiResponse = {
        success: true,
        data,
        cached,
        cacheAge: cacheAge || undefined,
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching air quality data:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

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
      const status = apiService.getServiceStatus();

      const response: ServiceStatusResponse = {
        success: true,
        data: {
          ...status,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      console.error("Error getting service status:", error);

      res.status(500).json({
        success: false,
        data: {
          cache: { size: 0, keys: [] },
          rateLimit: null,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
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
        message: "Cache cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);

      res.status(500).json({
        success: false,
        error: "Failed to clear cache",
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}

export const airQualityController = new AirQualityController();

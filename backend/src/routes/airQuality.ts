import { Router } from "express";
import { airQualityController } from "../controllers/AirQualityController";

const router = Router();

/**
 * @route GET /api/air-quality
 * @desc Get air quality data for given coordinates
 * @query latitude - Latitude coordinate (required)
 * @query longitude - Longitude coordinate (required)
 * @returns Air quality data with AQI and pollutant information
 */
router.get("/", airQualityController.getAirQuality.bind(airQualityController));

/**
 * @route GET /api/air-quality/status
 * @desc Get service status and cache statistics
 * @returns Service status information
 */
router.get(
  "/status",
  airQualityController.getServiceStatus.bind(airQualityController),
);

/**
 * @route POST /api/air-quality/clear-cache
 * @desc Clear the air quality cache
 * @returns Success message
 */
router.post(
  "/clear-cache",
  airQualityController.clearCache.bind(airQualityController),
);

/**
 * @route GET /api/air-quality/health
 * @desc Health check endpoint
 * @returns Health status
 */
router.get(
  "/health",
  airQualityController.healthCheck.bind(airQualityController),
);

export default router;

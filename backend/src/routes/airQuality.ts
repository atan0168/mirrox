import { Router } from 'express';
import { airQualityController } from '../controllers/AirQualityController';

const router = Router();

/**
 * @route GET /api/air-quality
 * @desc Get air quality data for given coordinates
 * @query latitude - Latitude coordinate (required)
 * @query longitude - Longitude coordinate (required)
 * @returns Air quality data with AQI and pollutant information
 */
router.get('/', airQualityController.getAirQuality.bind(airQualityController));

/**
 * @route GET /api/air-quality/status
 * @desc Get service status and cache statistics
 * @returns Service status information
 */
router.get(
  '/status',
  airQualityController.getServiceStatus.bind(airQualityController)
);

/**
 * @route POST /api/air-quality/clear-cache
 * @desc Clear the air quality cache
 * @returns Success message
 */
router.post(
  '/clear-cache',
  airQualityController.clearCache.bind(airQualityController)
);

/**
 * @route GET /api/air-quality/health
 * @desc Health check endpoint
 * @returns Health status
 */
router.get(
  '/health',
  airQualityController.healthCheck.bind(airQualityController)
);

// AQICN Routes for World Air Quality Index Data

/**
 * @route GET /api/air-quality/aqicn
 * @desc Get air quality data from AQICN by coordinates
 * @query latitude - Latitude coordinate (required)
 * @query longitude - Longitude coordinate (required)
 * @returns AQICN air quality data for the nearest monitoring station
 */
router.get(
  '/aqicn',
  airQualityController.getAQICNAirQuality.bind(airQualityController)
);

/**
 * @route GET /api/air-quality/aqicn/station/:stationId
 * @desc Get air quality data from AQICN by station ID
 * @param stationId - AQICN station ID
 * @returns AQICN air quality data for the specified station
 */
router.get(
  '/aqicn/station/:stationId',
  airQualityController.getAQICNStationData.bind(airQualityController)
);

/**
 * @route GET /api/air-quality/aqicn/search
 * @desc Search for AQICN stations near coordinates
 * @query latitude - Latitude coordinate (required)
 * @query longitude - Longitude coordinate (required)
 * @query radius - Search radius in kilometers (optional, default: 50)
 * @returns AQICN stations within the specified radius
 */
router.get(
  '/aqicn/search',
  airQualityController.searchAQICNStations.bind(airQualityController)
);

/**
 * @route POST /api/air-quality/aqicn/clear-cache
 * @desc Clear the AQICN cache
 * @returns Success message
 */
router.post(
  '/aqicn/clear-cache',
  airQualityController.clearAQICNCache.bind(airQualityController)
);

export default router;

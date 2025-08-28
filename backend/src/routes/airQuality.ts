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

// MyEQMS Routes for Malaysian Air Quality Data

/**
 * @route GET /api/air-quality/malaysia
 * @desc Get Malaysian air quality data by location
 * @query latitude - Latitude coordinate (required)
 * @query longitude - Longitude coordinate (required)
 * @query radius - Search radius in kilometers (optional, default: 50)
 * @returns Malaysian air quality stations within the specified radius
 */
router.get(
  "/malaysia",
  airQualityController.getMalaysianAirQuality.bind(airQualityController),
);

/**
 * @route GET /api/air-quality/malaysia/stations
 * @desc Get all active Malaysian air quality stations
 * @returns All active Malaysian air quality monitoring stations
 */
router.get(
  "/malaysia/stations",
  airQualityController.getAllMalaysianStations.bind(airQualityController),
);

/**
 * @route GET /api/air-quality/malaysia/state/:state
 * @desc Get Malaysian air quality data by state
 * @param state - Malaysian state name (e.g., 'Selangor', 'Kuala Lumpur')
 * @returns Malaysian air quality stations in the specified state
 */
router.get(
  "/malaysia/state/:state",
  airQualityController.getMalaysianAirQualityByState.bind(airQualityController),
);

/**
 * @route GET /api/air-quality/malaysia/region/:region
 * @desc Get Malaysian air quality data by region
 * @param region - Malaysian region (e.g., 'Central', 'Northern', 'Southern', 'Eastern', 'East Malaysia')
 * @returns Malaysian air quality stations in the specified region
 */
router.get(
  "/malaysia/region/:region",
  airQualityController.getMalaysianAirQualityByRegion.bind(
    airQualityController,
  ),
);

/**
 * @route GET /api/air-quality/malaysia/station/:stationId
 * @desc Get specific Malaysian air quality station data
 * @param stationId - Station ID (e.g., 'CA0001', 'CA0002')
 * @returns Detailed air quality data for the specified station
 */
router.get(
  "/malaysia/station/:stationId",
  airQualityController.getMalaysianStationData.bind(airQualityController),
);

/**
 * @route GET /api/air-quality/malaysia/station/:stationId/trend
 * @desc Get trend data for a Malaysian air quality station
 * @param stationId - Station ID (e.g., 'CA0001', 'CA0002')
 * @query parameter - Data parameter (optional, default: 'api', options: 'api', 'pm25', 'pm10', 'temperature', 'humidity')
 * @query hours - Hours back to fetch data (optional, default: 24, max: 168)
 * @returns Historical trend data for the specified station and parameter
 */
router.get(
  "/malaysia/station/:stationId/trend",
  airQualityController.getMalaysianStationTrend.bind(airQualityController),
);

export default router;

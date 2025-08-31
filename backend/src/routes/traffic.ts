import { Router } from 'express';
import { trafficController } from '../controllers/TrafficController';

const router = Router();

/**
 * @route GET /api/traffic/congestion
 * @desc Get congestion factor for given coordinates
 * @query lat - Latitude (required)
 * @query lng - Longitude (required)
 * @example /api/traffic/congestion?lat=3.1390&lng=101.6869
 */
router.get('/congestion', trafficController.getCongestionFactor);

/**
 * @route GET /api/traffic/status
 * @desc Get traffic service status and configuration
 */
router.get('/status', trafficController.getStatus);

/**
 * @route POST /api/traffic/cache/clear
 * @desc Clear traffic data cache (for testing/debugging)
 */
router.post('/cache/clear', trafficController.clearCache);

export default router;

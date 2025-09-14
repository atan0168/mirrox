import { Router } from 'express';
import { dengueController } from '../controllers/DengueController';

const router = Router();

/**
 * @route GET /api/dengue/states
 * @desc Get daily, cumulative cases and deaths by state (attributes only)
 */
router.get('/states', dengueController.getStates.bind(dengueController));

/**
 * @route GET /api/dengue/hotspots
 * @desc Get hotspot locations around a WGS84 point with optional radius (km, default 5)
 * @query latitude, longitude (WGS84 / EPSG:4326), radius (km)
 */
router.get('/hotspots', dengueController.getHotspots.bind(dengueController));

/**
 * @route GET /api/dengue/outbreaks
 * @desc Get active outbreak areas around a WGS84 point with optional radius (km, default 5)
 * @query latitude, longitude (WGS84 / EPSG:4326), radius (km)
 */
router.get(
  '/outbreaks',
  dengueController.getActiveOutbreaks.bind(dengueController)
);

export default router;

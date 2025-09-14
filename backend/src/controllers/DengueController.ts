import { Request, Response } from 'express';
import { dengueService } from '../services/DengueService';

function parsePointAndRadius(req: Request) {
  const q = req.query as Record<string, string>;
  const latStr = q.latitude ?? q.lat;
  const lonStr = q.longitude ?? q.lon ?? q.lng;
  const radiusStr = q.radius ?? q.radiusKm;

  if (!latStr || !lonStr) return null;

  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lonStr);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  // default 50km if not provided; if provided treat as km unless explicitly meters? we keep km per API
  const radiusKm = radiusStr ? parseFloat(radiusStr) : 50;
  if (Number.isNaN(radiusKm) || radiusKm <= 0) return null;

  return { latitude, longitude, radiusKm };
}

function validateWGS84Point(latitude: number, longitude: number) {
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

export class DengueController {
  /**
   * GET /api/dengue/states
   * Returns daily, cumulative cases and deaths by state (attributes only)
   */
  async getStates(req: Request, res: Response) {
    try {
      const data = await dengueService.getStateStats();
      res.json({ success: true, data, cached: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch state data';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * GET /api/dengue/hotspots
   * Query hotspot locations around a WGS84 point with radius (km)
   * Query params:
   *  - latitude, longitude (WGS84)
   *  - radius (optional, km; default 5)
   */
  async getHotspots(req: Request, res: Response) {
    try {
      const parsed = parsePointAndRadius(req);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error:
            'latitude and longitude are required. Provide WGS84 coordinates and optional radius in km (default 5).',
        });
        return;
      }
      const { latitude, longitude, radiusKm } = parsed;
      if (!validateWGS84Point(latitude, longitude)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid coordinates. WGS84 required: latitude [-90,90], longitude [-180,180].',
        });
        return;
      }

      const data = await dengueService.getHotspotsByPoint(
        longitude,
        latitude,
        Math.round(radiusKm * 1000)
      );
      res.json({
        success: true,
        data,
        cached: false,
        spatialReference: 'WGS84 (EPSG:4326)',
        query: { latitude, longitude, radiusKm },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch hotspots';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * GET /api/dengue/outbreaks
   * Query active outbreak areas around a WGS84 point with radius (km)
   */
  async getActiveOutbreaks(req: Request, res: Response) {
    try {
      const parsed = parsePointAndRadius(req);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error:
            'latitude and longitude are required. Provide WGS84 coordinates and optional radius in km (default 5).',
        });
        return;
      }
      const { latitude, longitude, radiusKm } = parsed;
      if (!validateWGS84Point(latitude, longitude)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid coordinates. WGS84 required: latitude [-90,90], longitude [-180,180].',
        });
        return;
      }

      const data = await dengueService.getActiveOutbreaksByPoint(
        longitude,
        latitude,
        Math.round(radiusKm * 1000)
      );
      res.json({
        success: true,
        data,
        cached: false,
        spatialReference: 'WGS84 (EPSG:4326)',
        query: { latitude, longitude, radiusKm },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch active outbreak areas';
      res.status(500).json({ success: false, error: message });
    }
  }
}

export const dengueController = new DengueController();

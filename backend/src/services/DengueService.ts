import axios from 'axios';
import * as qs from 'querystring';
import { cacheService } from './CacheService';
import config from '../utils/config';

export class DengueService {
  private readonly proxyBase = 'https://sppk.mysa.gov.my/proxy/proxy.php?';
  private readonly serviceBase =
    'https://mygis.mysa.gov.my/erica1/rest/services/iDengue/WM_idengue/MapServer';

  /**
   * Get daily cases, cumulative cases and deaths by state (attributes only)
   * Caches for 6 hours
   */
  async getStateStats(): Promise<ArcGISResponse<StateAttributes>> {
    const cacheKey = 'dengue_states';
    const cached = cacheService.get<ArcGISResponse<StateAttributes>>(cacheKey);
    if (cached) return cached;

    const qs = new URLSearchParams({
      f: 'json',
      where: '1=1',
      returnGeometry: 'false',
      outFields: [
        'NEGERI',
        'JUMLAH_HARIAN',
        'JUMLAH_SPATIALHARIAN',
        'JUMLAH_SPATIALKUMCURR',
        'JUMLAH_KUMULATIF',
        'JUMLAH_KEMATIAN',
      ].join(','),
      orderByFields: 'NEGERI ASC',
    }).toString();

    const target = `${this.serviceBase}/5/query?${qs}`;
    const url = this.proxyBase + encodeURIComponent(target);

    const { data } = await axios.get(url);

    const typed = data as ArcGISResponse<StateAttributes>;
    cacheService.set(cacheKey, typed, config.cache.dengueTtl);
    return typed;
  }

  /**
   * Query dynamic layer using a WGS84 point + radius (meters)
   */
  private async queryDynamicLayerByPoint<TAttr, TGeom>(
    longitude: number,
    latitude: number,
    radiusMeters: number,
    mapLayerId: number,
    outFields: string[]
  ): Promise<ArcGISResponse<TAttr, TGeom>> {
    const cacheKey = cacheService.generateLocationKey(
      latitude,
      longitude,
      `dengue_layer_${mapLayerId}_r${Math.round(radiusMeters / 1000)}`,
      3
    );
    const cached = cacheService.get<ArcGISResponse<TAttr, TGeom>>(cacheKey);
    if (cached) return cached;

    const url = this.proxyBase + this.serviceBase + '/dynamicLayer/query';

    // Geometry point using WGS84 (EPSG:4326)
    const geometry = {
      x: longitude,
      y: latitude,
      spatialReference: { wkid: 4326 },
    };

    const form = {
      f: 'json',
      returnGeometry: 'true',
      outSR: 4326,
      spatialRel: 'esriSpatialRelIntersects',
      geometry: JSON.stringify(geometry),
      geometryType: 'esriGeometryPoint',
      inSR: 4326,
      distance: radiusMeters,
      units: 'esriSRUnit_Meter',
      where: '1=1',
      outFields: outFields.join(','),
      layer: JSON.stringify({ source: { type: 'mapLayer', mapLayerId } }),
    } as const;

    const { data } = await axios.post(url, qs.stringify(form), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    const typed = data as ArcGISResponse<TAttr, TGeom>;
    cacheService.set(cacheKey, typed, config.cache.dengueTtl);
    return typed;
  }

  /**
   * Get hotspot locations within bbox (WGS84)
   */
  async getHotspotsByPoint(
    longitude: number,
    latitude: number,
    radiusMeters: number
  ): Promise<ArcGISResponse<HotspotAttributes, PointGeometry>> {
    const outFields = [
      'SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK',
      'SPWD.DBO_LOKALITI_POINTS.LOKALITI',
      'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES',
    ];
    // mapLayerId for hotspots is 0 in the provided spec
    return this.queryDynamicLayerByPoint<HotspotAttributes, PointGeometry>(
      longitude,
      latitude,
      radiusMeters,
      0,
      outFields
    );
  }

  /**
   * Get active outbreak areas within bbox (WGS84)
   */
  async getActiveOutbreaksByPoint(
    longitude: number,
    latitude: number,
    radiusMeters: number
  ): Promise<ArcGISResponse<OutbreakAttributes, PolygonGeometry>> {
    const outFields = [
      'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI',
      'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES',
    ];
    // mapLayerId for Kawasan Wabak Aktif is 4 per the spec
    return this.queryDynamicLayerByPoint<OutbreakAttributes, PolygonGeometry>(
      longitude,
      latitude,
      radiusMeters,
      4,
      outFields
    );
  }
}

export const dengueService = new DengueService();

// ---- Types for ArcGIS responses ----
export interface ArcGISField {
  name: string;
  type: string;
  alias: string;
  length?: number;
}

export interface ArcGISSpatialReference {
  wkid?: number;
  latestWkid?: number;
}

export interface ArcGISFeature<TAttributes, TGeometry = undefined> {
  attributes: TAttributes;
  geometry?: TGeometry;
}

export interface ArcGISResponse<TAttributes, TGeometry = undefined> {
  displayFieldName?: string;
  fieldAliases: Record<string, string>;
  geometryType?: string; // e.g., 'esriGeometryPoint' | 'esriGeometryPolygon'
  spatialReference?: ArcGISSpatialReference;
  fields: ArcGISField[];
  features: Array<ArcGISFeature<TAttributes, TGeometry>>;
}

export interface PointGeometry {
  x: number;
  y: number;
}

export interface PolygonGeometry {
  // rings: array of rings; each ring is array of [x, y] coordinates
  rings: number[][][];
}

export interface HotspotAttributes {
  'SPWD.DBO_LOKALITI_POINTS.LOKALITI': string;
  'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES': number;
  // optional additional fields like TEMPOH_WABAK can appear
  [key: string]: string | number | undefined;
}

export interface OutbreakAttributes {
  'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI': string;
  'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES': number;
  [key: string]: string | number | undefined;
}

export interface StateAttributes {
  NEGERI: string;
  JUMLAH_HARIAN: number;
  JUMLAH_SPATIALHARIAN: number;
  JUMLAH_SPATIALKUMCURR: number;
  JUMLAH_KUMULATIF: number;
  JUMLAH_KEMATIAN: number;
}

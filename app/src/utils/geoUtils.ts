import { Coordinates } from '../models/User';

type FeatureProps = {
  uid: string;
  label?: string;
  name?: string;
  subtitle?: string;
};
type PointGeom = { type: 'Point'; coordinates: [number, number] };
type PolygonGeom = { type: 'Polygon'; coordinates: number[][][] };
type PointFeatureFC = { properties: FeatureProps; geometry: PointGeom };
type PolygonFeatureFC = { properties: FeatureProps; geometry: PolygonGeom };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const isFeatureProps = (v: unknown): v is FeatureProps =>
  isRecord(v) && 'uid' in v;

export const isPointGeom = (g: unknown): g is PointGeom => {
  if (!isRecord(g)) return false;
  const r = g as Record<string, unknown>;
  if (r['type'] !== 'Point') return false;
  const coords = r['coordinates'] as unknown;
  return (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  );
};

export const isPolygonGeom = (g: unknown): g is PolygonGeom => {
  if (!isRecord(g)) return false;
  const r = g as Record<string, unknown>;
  if (r['type'] !== 'Polygon') return false;
  return Array.isArray(r['coordinates']);
};

export const asPointFeature = (x: unknown): PointFeatureFC | null => {
  if (!isRecord(x)) return null;
  const xr = x as Record<string, unknown>;
  const props = xr['properties'] as unknown;
  const geom = xr['geometry'] as unknown;
  if (isFeatureProps(props) && isPointGeom(geom)) {
    return { properties: props, geometry: geom };
  }
  return null;
};

export const asPolygonFeature = (x: unknown): PolygonFeatureFC | null => {
  if (!isRecord(x)) return null;
  const xr = x as Record<string, unknown>;
  const props = xr['properties'] as unknown;
  const geom = xr['geometry'] as unknown;
  if (isFeatureProps(props) && isPolygonGeom(geom)) {
    return { properties: props, geometry: geom };
  }
  return null;
};

const EARTH_RADIUS_KM = 6371; // Mean Earth radius

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function calculateDistanceInKm(
  from: Coordinates,
  to: Coordinates
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function isWithinRadiusKm(
  from: Coordinates,
  to: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistanceInKm(from, to) <= radiusKm;
}

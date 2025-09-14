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

export interface DenguePredictResponse {
  state: string;
  as_of: {
    ew_year: number;
    ew: number;
    week_start: string;
    week_end: string;
    source: string;
  };
  season: {
    lags: number;
    prob_in_season: number;
    in_season: boolean;
    threshold: number;
  };
  trend: {
    lags: number;
    prob_trend_increase_next_week: number;
    trend_increase: boolean;
    threshold: number;
  };
}

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
  fields: ArcGISField[];
  features: Array<ArcGISFeature<TAttributes, TGeometry>>;
  geometryType?: string;
  spatialReference?: ArcGISSpatialReference;
}

export interface PointGeometry {
  x: number;
  y: number;
}

export interface PolygonGeometry {
  rings: number[][][];
}

export interface HotspotAttributes {
  'SPWD.DBO_LOKALITI_POINTS.LOKALITI': string;
  'SPWD.AVT_HOTSPOTMINGGUAN.KUMULATIF_KES': number;
  'SPWD.AVT_HOTSPOTMINGGUAN.TEMPOH_WABAK'?: number;
}

export interface OutbreakAttributes {
  'SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI': string;
  'SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES': number;
}

export interface StateAttributes {
  NEGERI: string;
  JUMLAH_HARIAN: number;
  JUMLAH_SPATIALHARIAN: number;
  JUMLAH_SPATIALKUMCURR: number;
  JUMLAH_KUMULATIF: number;
  JUMLAH_KEMATIAN: number;
}

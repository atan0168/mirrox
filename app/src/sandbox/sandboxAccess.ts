import type { AirQualityData } from '../models/AirQuality';
import type {
  ArcGISResponse,
  DenguePredictResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
} from '../models/Dengue';

export interface SandboxDenguePrediction {
  success: boolean;
  data?: DenguePredictResponse;
  error?: string;
}

export interface SandboxStateSnapshot {
  enabled: boolean;
  airQuality: AirQualityData | null;
  dengueHotspots: ArcGISResponse<HotspotAttributes, PointGeometry> | null;
  dengueOutbreaks: ArcGISResponse<OutbreakAttributes, PolygonGeometry> | null;
  denguePrediction: SandboxDenguePrediction | null;
}

const FALLBACK_STATE: SandboxStateSnapshot = {
  enabled: false,
  airQuality: null,
  dengueHotspots: null,
  dengueOutbreaks: null,
  denguePrediction: null,
};

type SandboxAccessor = () => SandboxStateSnapshot;

let getSandboxStateInternal: SandboxAccessor = () => FALLBACK_STATE;

export function registerSandboxStateAccessor(accessor: SandboxAccessor): void {
  getSandboxStateInternal = accessor;
}

export function getSandboxState(): SandboxStateSnapshot {
  try {
    return getSandboxStateInternal();
  } catch (error) {
    console.warn(
      '[Sandbox] Failed to resolve sandbox state, falling back to defaults',
      error
    );
    return FALLBACK_STATE;
  }
}

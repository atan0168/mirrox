import React from 'react';
import { AlertTriangle, Bug } from 'lucide-react-native';
import { colors } from '../../../theme';
import {
  DenguePredictResponse,
  ArcGISResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
} from '../../../services/BackendApiService';

export function getDengueDisplay(
  denguePrediction: DenguePredictResponse | null | undefined,
  dengueHotspotCount: number,
  dengueOutbreakCount: number,
  isError: boolean
) {
  let color: string;
  if (isError) color = colors.red[500];
  else if (dengueOutbreakCount > 0) color = colors.orange[700];
  else if (dengueHotspotCount > 0) color = colors.yellow[400];
  else if (!denguePrediction) color = colors.neutral[400];
  else {
    const pSeason = denguePrediction.season?.prob_in_season ?? 0;
    const pTrend = denguePrediction.trend?.prob_trend_increase_next_week ?? 0;
    const high = pSeason >= 0.6 || pTrend >= 0.5;
    const moderate = pSeason >= 0.3 || pTrend >= 0.3;
    if (high) color = colors.orange[600];
    else if (moderate) color = colors.yellow[400];
    else color = colors.green[500];
  }

  const icon = isError ? (
    <AlertTriangle size={24} color={colors.red[500]} />
  ) : (
    <Bug size={24} color={color} />
  );

  const statusText = isError
    ? undefined
    : dengueOutbreakCount > 0
      ? 'Active outbreak nearby'
      : dengueHotspotCount > 0
        ? 'Hotspot nearby'
        : 'Low risk';

  const valueText = isError
    ? 'Error'
    : dengueOutbreakCount > 0
      ? `${dengueOutbreakCount}`
      : dengueHotspotCount > 0
        ? `${dengueHotspotCount}`
        : denguePrediction
          ? `${Math.round((denguePrediction.season?.prob_in_season ?? 0) * 100)}%`
          : 'N/A';

  return { color, icon, statusText, valueText } as const;
}

// Re-export types for convenience to call sites
export type {
  DenguePredictResponse,
  ArcGISResponse,
  HotspotAttributes,
  OutbreakAttributes,
  PointGeometry,
  PolygonGeometry,
};

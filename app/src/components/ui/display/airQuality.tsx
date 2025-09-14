import React from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle,
  Wind,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme';
import { getAQIInfo, getShortClassification } from '../../../utils/aqiUtils';

export interface AirQualityData {
  aqi?: number;
  classification?: string;
  healthAdvice?: string;
  timestamp?: string;
  source?: string;
}

export function getAirQualityDisplay(
  airQuality: AirQualityData | null | undefined,
  isError: boolean
) {
  const color = isError
    ? colors.red[500]
    : !airQuality?.aqi
      ? colors.neutral[400]
      : getAQIInfo(airQuality.aqi).colorCode;

  let icon: React.ReactNode;
  if (isError) icon = <AlertTriangle size={24} color={colors.red[500]} />;
  else if (!airQuality?.aqi)
    icon = <Wind size={24} color={colors.neutral[400]} />;
  else {
    const aqi = airQuality.aqi;
    if (aqi <= 50) icon = <CheckCircle size={24} color={color} />;
    else if (aqi <= 100) icon = <Activity size={24} color={color} />;
    else if (aqi <= 150) icon = <AlertTriangle size={24} color={color} />;
    else icon = <XCircle size={24} color={color} />;
  }

  const statusText = isError
    ? undefined
    : airQuality?.classification ||
      (airQuality?.aqi &&
        getShortClassification(getAQIInfo(airQuality.aqi).classification)) ||
      undefined;

  return { color, icon, statusText } as const;
}

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Car,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme';

export interface TrafficData {
  stressLevel: 'none' | 'mild' | 'moderate' | 'high' | string;
  congestionFactor: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
}

export function getTrafficDisplay(
  trafficData: TrafficData | null | undefined,
  isError: boolean,
  iconSize: number = 24
) {
  const color = isError
    ? colors.red[500]
    : !trafficData
      ? colors.neutral[400]
      : trafficData.stressLevel === 'none'
        ? colors.green[400]
        : trafficData.stressLevel === 'mild'
          ? colors.yellow[400]
          : trafficData.stressLevel === 'moderate'
            ? colors.orange[600]
            : trafficData.stressLevel === 'high'
              ? colors.red[500]
              : colors.neutral[400];

  let icon: React.ReactNode;
  if (isError) icon = <AlertTriangle size={iconSize} color={colors.red[500]} />;
  else if (!trafficData)
    icon = <Car size={iconSize} color={colors.neutral[400]} />;
  else {
    switch (trafficData.stressLevel) {
      case 'none':
        icon = <CheckCircle size={iconSize} color={color} />;
        break;
      case 'mild':
        icon = <AlertTriangle size={iconSize} color={color} />;
        break;
      case 'moderate':
        icon = <AlertCircle size={iconSize} color={color} />;
        break;
      case 'high':
        icon = <XCircle size={iconSize} color={color} />;
        break;
      default:
        icon = <Car size={iconSize} color={color} />;
        break;
    }
  }

  const statusText = isError ? undefined : trafficData?.stressLevel;

  const description = !trafficData
    ? undefined
    : trafficData.stressLevel === 'none'
      ? 'Traffic is flowing smoothly'
      : trafficData.stressLevel === 'mild'
        ? 'Light traffic congestion detected'
        : trafficData.stressLevel === 'moderate'
          ? 'Moderate traffic delays expected'
          : trafficData.stressLevel === 'high'
            ? 'Heavy traffic congestion - high stress'
            : undefined;

  return { color, icon, statusText, description } as const;
}

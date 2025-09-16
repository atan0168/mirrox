import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Car,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme';

// Minimal traffic data shape used for display; no personal stress terminology
export interface TrafficData {
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
  const classify = (factor?: number) => {
    if (factor == null) return 'unknown' as const;
    if (factor <= 1.3) return 'smooth' as const;
    if (factor <= 2.0) return 'mild' as const;
    if (factor <= 3.0) return 'moderate' as const;
    return 'high' as const;
  };
  const level =
    isError || !trafficData
      ? 'unknown'
      : classify(trafficData.congestionFactor);
  const color = isError
    ? colors.red[500]
    : level === 'unknown'
      ? colors.neutral[400]
      : level === 'smooth'
        ? colors.green[400]
        : level === 'mild'
          ? colors.yellow[400]
          : level === 'moderate'
            ? colors.orange[600]
            : colors.red[500];

  let icon: React.ReactNode;
  if (isError) icon = <AlertTriangle size={iconSize} color={colors.red[500]} />;
  else if (!trafficData)
    icon = <Car size={iconSize} color={colors.neutral[400]} />;
  else {
    switch (level) {
      case 'smooth':
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

  const statusText = isError
    ? undefined
    : level === 'unknown'
      ? undefined
      : level;

  const description = !trafficData
    ? undefined
    : level === 'smooth'
      ? 'Traffic is flowing smoothly'
      : level === 'mild'
        ? 'Light traffic congestion detected'
        : level === 'moderate'
          ? 'Moderate traffic delays expected'
          : level === 'high'
            ? 'Heavy traffic congestion'
            : undefined;

  return { color, icon, statusText, description, level } as const;
}

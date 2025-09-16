import React from 'react';
import { Snowflake, Sun, Thermometer } from 'lucide-react-native';
import { colors } from '../../../theme';

export interface WeatherSnapshot {
  temperature?: number | null;
  humidity?: number | null;
  uvIndex?: number | null;
}

export function getWeatherDisplay(weather: WeatherSnapshot | null | undefined) {
  if (weather?.temperature == null) {
    return {
      color: colors.neutral[400],
      icon: <Thermometer size={24} color={colors.neutral[400]} />,
      statusText: undefined,
    } as const;
  }

  const temp = weather.temperature;
  let color: string = colors.neutral[900];
  let statusText = 'Comfortable';
  let icon: React.ReactNode = <Thermometer size={24} color={colors.sky[500]} />;

  if (temp <= 10) {
    color = colors.sky[500];
    statusText = 'Cold';
    icon = <Snowflake size={24} color={color} />;
  } else if (temp <= 25) {
    color = colors.green[500];
    statusText = 'Comfortable';
    icon = <Thermometer size={24} color={color} />;
  } else if (temp <= 32) {
    color = colors.orange[500];
    statusText = 'Warm';
    icon = <Sun size={24} color={color} />;
  } else {
    color = colors.red[500];
    statusText = 'Hot';
    icon = <Sun size={24} color={color} />;
  }

  return {
    color,
    icon,
    statusText,
  } as const;
}

/**
 * Health metrics calculation utilities
 * Functions to derive health scores from various inputs
 */

import React from 'react';
import { View, Text } from 'react-native';
import { clamp } from './mathUtils';
import InfoTable, { TableRow } from '../components/ui/InfoTable';
import { colors, fontSize, spacing } from '../theme';

/**
 * Calculate energy level based on sleep hours
 * @param sleep Sleep hours (can be null/undefined)
 * @returns Energy percentage (0-100)
 */
export const deriveEnergy = (sleep?: number | null): number => {
  if (sleep == null) return 50;
  if (sleep >= 8) return 90;
  if (sleep >= 7) return 80;
  if (sleep >= 6) return 65;
  if (sleep >= 4) return 45;
  return 25;
};

/**
 * Calculate lung health based on Air Quality Index (AQI)
 * @param aqi Air Quality Index value (can be null/undefined)
 * @returns Lung health percentage (0-100)
 */
export const deriveLung = (aqi?: number | null): number => {
  if (aqi == null) return 60;
  if (aqi <= 50) return 90;
  if (aqi <= 100) return 75;
  if (aqi <= 150) return 60;
  if (aqi <= 200) return 45;
  if (aqi <= 300) return 30;
  return 15;
};

/**
 * Calculate skin glow based on sleep and commute method
 * @param sleep Sleep hours (can be null/undefined)
 * @param commute Commute method string (can be null/undefined)
 * @returns Skin glow percentage (10-95)
 */
export const deriveSkinGlow = (
  sleep?: number | null,
  commute?: string | null
): number => {
  let value = 50;

  // Sleep impact on skin
  if (sleep != null) {
    if (sleep >= 8) value += 30;
    else if (sleep >= 7) value += 20;
    else if (sleep >= 6) value += 10;
    else if (sleep < 5) value -= 10;
  }

  // Commute method impact on skin
  switch (commute) {
    case 'walk':
    case 'bike':
      value += 10; // Fresh air and exercise
      break;
    case 'wfh':
      value += 8; // Less pollution exposure
      break;
    case 'transit':
      value += 5; // Some pollution but less than car
      break;
    case 'car':
      value -= 5; // More pollution exposure
      break;
  }

  return clamp(value, 10, 95);
};

/**
 * Get detailed explanation for energy calculation
 * @param sleep Sleep hours
 * @returns Explanation string
 */
export const getEnergyExplanation = (
  sleep?: number | null
): React.ReactNode => {
  const rows: TableRow[] = [
    { label: '8+ hours', value: '90%', description: 'Excellent sleep' },
    { label: '7+ hours', value: '80%', description: 'Good sleep' },
    { label: '6+ hours', value: '65%', description: 'Fair sleep' },
    { label: '4+ hours', value: '45%', description: 'Low sleep' },
    { label: '< 4 hours', value: '25%', description: 'Very low sleep' },
  ];

  return (
    <View>
      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.neutral[700],
          lineHeight: 22,
          marginBottom: spacing.md,
        }}
      >
        Energy levels are based on your sleep duration. Better sleep yields
        better energy.
      </Text>

      <InfoTable title="Sleep Hours → Energy" rows={rows} />

      {sleep == null && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.neutral[600],
            lineHeight: 20,
            marginTop: spacing.md,
            fontStyle: 'italic',
          }}
        >
          No sleep data available for today — showing a default energy estimate.
        </Text>
      )}
    </View>
  );
};

/**
 * Get detailed explanation for lung health calculation
 * @param aqi Air Quality Index
 * @returns Explanation string
 */
export const getLungExplanation = (aqi?: number | null): React.ReactNode => {
  const rows: TableRow[] = [
    { label: 'AQI 0–50', value: '90%', description: 'Excellent air quality' },
    { label: 'AQI 51–100', value: '75%', description: 'Good air quality' },
    { label: 'AQI 101–150', value: '60%', description: 'Moderate air quality' },
    {
      label: 'AQI 151–200',
      value: '45%',
      description: 'Unhealthy for sensitive groups',
    },
    { label: 'AQI 201–300', value: '30%', description: 'Very unhealthy' },
    { label: 'AQI 301+', value: '15%', description: 'Hazardous air quality' },
  ];

  return (
    <View>
      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.neutral[700],
          lineHeight: 22,
          marginBottom: spacing.md,
        }}
      >
        Lung health is determined by local air quality (AQI). Lower AQI
        indicates cleaner air and better lung health.
      </Text>

      <InfoTable title="AQI → Lung Health" rows={rows} />

      {aqi == null && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.neutral[600],
            lineHeight: 20,
            marginTop: spacing.md,
            fontStyle: 'italic',
          }}
        >
          No air quality data available — showing a default estimate.
        </Text>
      )}
    </View>
  );
};

/**
 * Get detailed explanation for skin glow calculation
 * @param sleep Sleep hours
 * @param commute Commute method
 * @returns Explanation string
 */
export const getSkinGlowExplanation = (
  sleep?: number | null,
  commute?: string | null
): string => {
  const baseText = 'Skin glow combines sleep quality and commute method. ';
  const sleepText =
    'Good sleep (8+ hours) adds 30 points, 7+ hours adds 20 points, 6+ hours adds 10 points. ';
  const commuteText =
    'Walking or biking adds 10 points, working from home adds 8 points, transit adds 5 points, but driving subtracts 5 points from your skin health.';

  return baseText + sleepText + commuteText;
};

/**
 * Calculate overall health score from individual metrics
 * @param energy Energy percentage
 * @param lung Lung health percentage
 * @param skin Skin glow percentage
 * @returns Overall health score (0-100)
 */
export const calculateOverallHealth = (
  energy: number,
  lung: number,
  skin: number
): number => {
  // Weighted average: energy 40%, lung 35%, skin 25%
  const weighted = energy * 0.4 + lung * 0.35 + skin * 0.25;
  return Math.round(clamp(weighted));
};

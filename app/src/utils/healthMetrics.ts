/**
 * Health metrics calculation utilities
 * Functions to derive health scores from various inputs
 */

import { clamp } from './mathUtils';

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
export const getEnergyExplanation = (sleep?: number | null): string => {
  const baseText = 'Energy levels are based on your sleep duration. ';
  const ranges =
    'Getting 8+ hours gives you 90% energy, 7+ hours gives 80%, 6+ hours gives 65%, 4+ hours gives 45%, and less than 4 hours gives only 25% energy.';

  if (sleep == null) {
    return baseText + 'No sleep data available, showing default 50%. ' + ranges;
  }

  return baseText + ranges;
};

/**
 * Get detailed explanation for lung health calculation
 * @param aqi Air Quality Index
 * @returns Explanation string
 */
export const getLungExplanation = (aqi?: number | null): string => {
  const baseText = 'Lung health is determined by air quality (AQI). ';
  const ranges =
    'Excellent air (AQI ≤50) gives 90% lung health, good air (≤100) gives 75%, moderate (≤150) gives 60%, unhealthy (≤200) gives 45%, very unhealthy (≤300) gives 30%, and hazardous air gives only 15%.';

  if (aqi == null) {
    return (
      baseText + 'No air quality data available, showing default 60%. ' + ranges
    );
  }

  return baseText + ranges;
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


/**
 * Utility functions for working with Air Quality Index (AQI) data
 */

import { colors } from '../theme';

export interface AQIInfo {
  classification: string;
  colorCode: string;
  healthAdvice: string;
  level: number; // 1-6 for UI consistency
}

/**
 * Get AQI classification, color, and health advice based on AQI value
 * @param aqi Air Quality Index value
 * @returns Object with classification info
 */
export function getAQIInfo(aqi: number): AQIInfo {
  if (aqi <= 50) {
    return {
      classification: 'Good',
      colorCode: colors.green[400],
      healthAdvice:
        'Air quality is considered satisfactory, and air pollution poses little or no risk.',
      level: 1,
    };
  } else if (aqi <= 100) {
    return {
      classification: 'Moderate',
      colorCode: '#FFD138',
      healthAdvice:
        'Air quality is acceptable for most people. However, sensitive people may experience minor respiratory symptoms.',
      level: 2,
    };
  } else if (aqi <= 150) {
    return {
      classification: 'Unhealthy for Sensitive Groups',
      colorCode: '#FF7E00',
      healthAdvice:
        'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
      level: 3,
    };
  } else if (aqi <= 200) {
    return {
      classification: 'Unhealthy',
      colorCode: '#FF0000',
      healthAdvice:
        'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
      level: 4,
    };
  } else if (aqi <= 300) {
    return {
      classification: 'Very Unhealthy',
      colorCode: '#8F3F97',
      healthAdvice:
        'Health warnings of emergency conditions. The entire population is more likely to be affected.',
      level: 5,
    };
  } else {
    return {
      classification: 'Hazardous',
      colorCode: '#7E0023',
      healthAdvice:
        'Health alert: everyone may experience more serious health effects.',
      level: 6,
    };
  }
}

export function mapPrimaryPollutant(pollutant: string): string {
  switch (pollutant) {
    case 'pm25':
      return 'PM2.5';
    case 'pm10':
      return 'PM10';
    default:
      return pollutant;
  }
}

/**
 * Get a shortened version of the AQI classification for UI display
 * @param classification Full classification string
 * @returns Shortened classification
 */
export function getShortClassification(classification: string): string {
  switch (classification) {
    case 'Unhealthy for Sensitive Groups':
      return 'Unhealthy for Sensitive';
    case 'Very Unhealthy':
      return 'Very Unhealthy';
    default:
      return classification;
  }
}

/**
 * Get health recommendations based on AQI level
 * @param aqi Air Quality Index value
 * @param isOutdoor Whether the recommendation is for outdoor activities
 * @returns Array of recommendation strings
 */
export function getHealthRecommendations(
  aqi: number,
  _isOutdoor: boolean = true
): string[] {
  const level = getAQIInfo(aqi).level;

  if (level <= 2) {
    return [
      'Air quality is acceptable for outdoor activities',
      'No special precautions needed for most people',
    ];
  } else if (level === 3) {
    return [
      'Sensitive groups should limit outdoor activities',
      "Consider wearing a mask if you're sensitive to air pollution",
      'Keep windows closed if air quality is poor indoors',
    ];
  } else if (level === 4) {
    return [
      'Everyone should limit prolonged outdoor activities',
      'Wear a mask when going outside',
      'Keep windows closed and use air purifiers if available',
      'Sensitive groups should avoid outdoor activities',
    ];
  } else if (level === 5) {
    return [
      'Avoid outdoor activities',
      'Wear a high-quality mask (N95 or better) if you must go outside',
      'Keep windows and doors closed',
      'Use air purifiers indoors',
      'Consider postponing travel to the area',
    ];
  } else {
    return [
      'Stay indoors and avoid all outdoor activities',
      'Seal your home as much as possible',
      'Use high-quality air purifiers',
      'Wear N95 or better masks even for brief outdoor exposure',
      'Seek medical attention if you experience health symptoms',
    ];
  }
}

/**
 * Convert pollutant concentration to a human-readable string
 * @param value Pollutant concentration value
 * @param pollutant Pollutant type (pm25, pm10, etc.)
 * @returns Formatted string with units
 */
export function formatPollutantValue(
  value: number | null | undefined,
  pollutant: string
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const units = ['pm25', 'pm10', 'so2', 'no2', 'o3'].includes(
    pollutant.toLowerCase()
  )
    ? 'µg/m³'
    : 'mg/m³';

  return `${value.toFixed(1)} ${units}`;
}

/**
 * Check if air quality data is recent (within the last 3 hours)
 * @param timestamp ISO timestamp string
 * @returns boolean indicating if data is recent
 */
export function isDataRecent(timestamp?: string): boolean {
  if (!timestamp) return false;

  const dataTime = new Date(timestamp);
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  return dataTime >= threeHoursAgo;
}

/**
 * Format timestamp for display
 * @param timestamp ISO timestamp string
 * @returns Formatted time string
 */
export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours === 0) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
}

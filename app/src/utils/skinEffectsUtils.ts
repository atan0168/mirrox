/**
 * Utility functions for calculating skin effects based on air quality
 */

/**
 * Calculate skin tone adjustment based on PM2.5 levels
 * Higher PM2.5 levels cause skin to appear more dull/darker due to pollution effects
 * @param pm25 PM2.5 concentration in µg/m³
 * @returns Skin tone adjustment value (-1 to 0, where negative values darken the skin)
 */
export function calculateSkinEffectFromPM25(
  pm25: number | null | undefined
): number {
  if (pm25 === null || pm25 === undefined || pm25 < 0) {
    return 0; // No adjustment if no data
  }

  // WHO Air Quality Guidelines and health impact thresholds
  // PM2.5 levels and their effects on skin:
  // 0-12 µg/m³: Good air quality, no skin effects
  // 12-35 µg/m³: Moderate, slight skin dullness
  // 35-55 µg/m³: Unhealthy for sensitive groups, noticeable skin effects
  // 55-150 µg/m³: Unhealthy, significant skin darkening/dullness
  // 150+ µg/m³: Very unhealthy/hazardous, severe skin effects

  if (pm25 <= 12) {
    // Good air quality - no skin effects
    return 0;
  } else if (pm25 <= 35) {
    // Moderate air quality - slight skin dullness
    // Linear interpolation from 0 to -0.1
    const factor = (pm25 - 12) / (35 - 12);
    return -0.1 * factor;
  } else if (pm25 <= 55) {
    // Unhealthy for sensitive groups - noticeable skin effects
    // Linear interpolation from -0.1 to -0.25
    const factor = (pm25 - 35) / (55 - 35);
    return -0.1 + -0.15 * factor;
  } else if (pm25 <= 150) {
    // Unhealthy - significant skin effects
    // Linear interpolation from -0.25 to -0.5
    const factor = (pm25 - 55) / (150 - 55);
    return -0.25 + -0.25 * factor;
  } else {
    // Very unhealthy/hazardous - severe skin effects
    // Cap at -0.7 for extreme pollution
    const factor = Math.min((pm25 - 150) / 150, 1);
    return -0.5 + -0.2 * factor;
  }
}

/**
 * Get a description of the skin effects based on PM2.5 levels
 * @param pm25 PM2.5 concentration in µg/m³
 * @returns Human-readable description of skin effects
 */
export function getSkinEffectDescription(
  pm25: number | null | undefined
): string {
  if (pm25 === null || pm25 === undefined || pm25 < 0) {
    return 'No air quality data available';
  }

  if (pm25 <= 12) {
    return 'Clean air - healthy skin appearance';
  } else if (pm25 <= 35) {
    return 'Slight skin dullness from air pollution';
  } else if (pm25 <= 55) {
    return 'Noticeable skin effects from poor air quality';
  } else if (pm25 <= 150) {
    return 'Significant skin darkening from pollution exposure';
  } else {
    return 'Severe skin effects from hazardous air quality';
  }
}

/**
 * Calculate combined skin adjustment from multiple air quality factors
 * @param airQualityData Object containing pollutant concentrations
 * @returns Combined skin tone adjustment value
 */
export function calculateCombinedSkinEffects(airQualityData: {
  pm25?: number | null;
  pm10?: number | null;
  aqi?: number | null;
}): {
  adjustment: number;
  primaryFactor: string;
  description: string;
} {
  let primaryAdjustment = 0;
  let primaryFactor = 'none';
  let description = 'No air quality effects on skin';

  // PM2.5 has the strongest effect on skin appearance
  if (airQualityData.pm25 !== null && airQualityData.pm25 !== undefined) {
    primaryAdjustment = calculateSkinEffectFromPM25(airQualityData.pm25);
    primaryFactor = 'PM2.5';
    description = getSkinEffectDescription(airQualityData.pm25);
  } else if (airQualityData.aqi !== null && airQualityData.aqi !== undefined) {
    // Fallback to AQI-based estimation if PM2.5 is not available
    // Rough conversion: AQI to estimated PM2.5 for skin effects
    let estimatedPM25 = 0;
    if (airQualityData.aqi <= 50) {
      estimatedPM25 = airQualityData.aqi * 0.24; // ~12 µg/m³ at AQI 50
    } else if (airQualityData.aqi <= 100) {
      estimatedPM25 = 12 + (airQualityData.aqi - 50) * 0.46; // ~35 µg/m³ at AQI 100
    } else if (airQualityData.aqi <= 150) {
      estimatedPM25 = 35 + (airQualityData.aqi - 100) * 0.4; // ~55 µg/m³ at AQI 150
    } else {
      estimatedPM25 = 55 + (airQualityData.aqi - 150) * 0.95; // Higher levels
    }

    primaryAdjustment = calculateSkinEffectFromPM25(estimatedPM25);
    primaryFactor = 'AQI (estimated)';
    description = `Estimated skin effects from AQI ${airQualityData.aqi}`;
  }

  // Additional minor adjustments from PM10 (less significant than PM2.5)
  if (
    airQualityData.pm10 !== null &&
    airQualityData.pm10 !== undefined &&
    airQualityData.pm10 > 50
  ) {
    const pm10Effect = Math.min((airQualityData.pm10 - 50) / 200, 0.1) * -0.1;
    primaryAdjustment += pm10Effect;
  }

  // Ensure adjustment stays within valid range
  primaryAdjustment = Math.max(-0.7, Math.min(0, primaryAdjustment));

  return {
    adjustment: primaryAdjustment,
    primaryFactor,
    description,
  };
}

/**
 * Get facial expression recommendation based on air quality
 * @param pm25 PM2.5 concentration in µg/m³
 * @param aqi Air Quality Index
 * @returns Recommended facial expression
 */
export function getRecommendedFacialExpression(
  pm25: number | null | undefined,
  aqi: number | null | undefined
): string {
  const effectiveValue = pm25 || (aqi ? aqi * 0.5 : 0); // Rough conversion for fallback

  if (effectiveValue <= 12) {
    return 'calm'; // Good air quality
  } else if (effectiveValue <= 35) {
    return 'neutral'; // Moderate air quality
  } else if (effectiveValue <= 55) {
    return 'concerned'; // Unhealthy for sensitive groups
  } else if (effectiveValue <= 150) {
    return 'tired'; // Unhealthy air
  } else {
    return 'sick'; // Very unhealthy/hazardous
  }
}

/**
 * Calculate smog effect settings based on air quality data
 * @param airQualityData Object containing air quality measurements
 * @returns Smog effect configuration
 */
export function calculateSmogEffects(airQualityData: {
  aqi?: number | null;
  pm25?: number | null;
  pm10?: number | null;
}): {
  enabled: boolean;
  intensity: number; // 0.0 to 1.0
  opacity: number; // 0.0 to 1.0
  density: number; // particle count
  description: string;
} {
  if (!airQualityData) {
    return {
      enabled: false,
      intensity: 0,
      opacity: 0,
      density: 0,
      description: 'No air quality data available',
    };
  }

  // Use PM2.5 as primary indicator, fallback to AQI
  let effectiveValue = 0;
  let primaryIndicator = 'none';

  if (airQualityData.pm25 !== null && airQualityData.pm25 !== undefined) {
    effectiveValue = airQualityData.pm25;
    primaryIndicator = 'PM2.5';
  } else if (airQualityData.aqi !== null && airQualityData.aqi !== undefined) {
    // Convert AQI to estimated PM2.5 for consistent thresholds
    if (airQualityData.aqi <= 50) {
      effectiveValue = airQualityData.aqi * 0.24; // ~12 µg/m³ at AQI 50
    } else if (airQualityData.aqi <= 100) {
      effectiveValue = 12 + (airQualityData.aqi - 50) * 0.46; // ~35 µg/m³ at AQI 100
    } else if (airQualityData.aqi <= 150) {
      effectiveValue = 35 + (airQualityData.aqi - 100) * 0.4; // ~55 µg/m³ at AQI 150
    } else {
      effectiveValue = 55 + (airQualityData.aqi - 150) * 0.95;
    }
    primaryIndicator = 'AQI';
  }

  // Calculate smog effects based on air quality thresholds
  if (effectiveValue <= 12) {
    // Good air quality - no smog
    return {
      enabled: false,
      intensity: 0,
      opacity: 0,
      density: 0,
      description: `Clean air (${primaryIndicator})`,
    };
  } else if (effectiveValue <= 35) {
    // Moderate air quality - very light smog
    const factor = (effectiveValue - 12) / (35 - 12);
    return {
      enabled: true,
      intensity: 0.2 + 0.2 * factor, // 0.2 to 0.4
      opacity: 0.1 + 0.1 * factor, // 0.1 to 0.2
      density: 20 + 20 * factor, // 20 to 40 particles
      description: `Light haze visible (${primaryIndicator})`,
    };
  } else if (effectiveValue <= 55) {
    // Unhealthy for sensitive groups - noticeable smog
    const factor = (effectiveValue - 35) / (55 - 35);
    return {
      enabled: true,
      intensity: 0.4 + 0.2 * factor, // 0.4 to 0.6
      opacity: 0.2 + 0.15 * factor, // 0.2 to 0.35
      density: 40 + 30 * factor, // 40 to 70 particles
      description: `Noticeable smog (${primaryIndicator})`,
    };
  } else if (effectiveValue <= 150) {
    // Unhealthy air - heavy smog
    const factor = (effectiveValue - 55) / (150 - 55);
    return {
      enabled: true,
      intensity: 0.6 + 0.25 * factor, // 0.6 to 0.85
      opacity: 0.35 + 0.25 * factor, // 0.35 to 0.6
      density: 70 + 50 * factor, // 70 to 120 particles
      description: `Heavy smog (${primaryIndicator})`,
    };
  } else {
    // Very unhealthy/hazardous - severe smog
    const factor = Math.min((effectiveValue - 150) / 150, 1);
    return {
      enabled: true,
      intensity: 0.85 + 0.15 * factor, // 0.85 to 1.0
      opacity: 0.6 + 0.3 * factor, // 0.6 to 0.9
      density: 120 + 80 * factor, // 120 to 200 particles
      description: `Severe smog - hazardous air (${primaryIndicator})`,
    };
  }
}

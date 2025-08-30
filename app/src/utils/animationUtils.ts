/**
 * Animation utility functions for automatic animation selection based on AQI levels
 */

import { getAQIInfo } from './aqiUtils';

export interface AnimationRecommendation {
  animation: string | null;
  reason: string;
  isAutomatic: boolean;
}

/**
 * Get the recommended animation based on AQI level
 * @param aqi Air Quality Index value
 * @returns Animation recommendation object
 */
export function getAnimationForAQI(
  aqi: number | null | undefined
): AnimationRecommendation {
  if (!aqi || aqi <= 0) {
    return {
      animation: null, // Use idle animations
      reason: 'No AQI data available - using idle animations',
      isAutomatic: true,
    };
  }

  // Good air quality (0-50): Use idle animations
  if (aqi <= 50) {
    return {
      animation: null, // Use idle animations
      reason: `Good air quality (AQI: ${aqi}) - using idle animations`,
      isAutomatic: true,
    };
  }

  // Moderate air quality (51-100): Use breathing animation only
  if (aqi <= 100) {
    return {
      animation: 'breathing',
      reason: `Moderate air quality (AQI: ${aqi}) - showing breathing animation`,
      isAutomatic: true,
    };
  }

  // Unhealthy air quality (101+): Use both cough and breathing animations
  if (aqi >= 101) {
    return {
      animation: 'M_Standing_Expressions_007', // Cough animation
      reason: `Unhealthy air quality (AQI: ${aqi}) - showing cough animation`,
      isAutomatic: true,
    };
  }

  // Fallback
  return {
    animation: null,
    reason: 'Fallback to idle animations',
    isAutomatic: true,
  };
}

/**
 * Check if the current animation should be overridden by AQI-based animation
 * @param currentAnimation Current active animation
 * @param aqiRecommendation AQI-based animation recommendation
 * @param isManuallySet Whether the current animation was manually set by user
 * @returns Whether to override the current animation
 */
export function shouldOverrideAnimation(
  currentAnimation: string | null,
  aqiRecommendation: AnimationRecommendation,
  isManuallySet: boolean
): boolean {
  // Don't override if user manually set an animation
  if (isManuallySet) {
    return false;
  }

  // Override if the recommended animation is different from current
  return currentAnimation !== aqiRecommendation.animation;
}

/**
 * Get a list of animations that should cycle for unhealthy AQI levels
 * @param aqi Air Quality Index value
 * @returns Array of animation names to cycle through
 */
export function getAnimationCycleForAQI(
  aqi: number | null | undefined
): string[] {
  if (!aqi || aqi <= 100) {
    return []; // No cycling for good/moderate air quality
  }

  // For unhealthy air quality, cycle between cough and breathing
  return ['M_Standing_Expressions_007', 'breathing'];
}


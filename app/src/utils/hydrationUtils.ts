/**
 * Hydration calculation utilities following clinical nutrition guidelines
 */

/**
 * Calculate baseline daily hydration goal using standard formula
 * @param weightKg User's body weight in kilograms
 * @returns Daily hydration goal in milliliters
 */
export function calculateBaselineHydrationGoal(weightKg: number): number {
  // Standard formula: 30-35 mL per kg of body weight
  // Using 30 mL as baseline (conservative estimate)
  const baselineMl = Math.round(weightKg * 30);

  // Ensure reasonable bounds (1L to 4L)
  return Math.max(1000, Math.min(4000, baselineMl));
}

/**
 * Calculate heat index category based on temperature and humidity
 * @param temperatureCelsius Temperature in Celsius
 * @param relativeHumidity Relative humidity as percentage (0-100)
 * @returns Heat index category
 */
export function calculateHeatIndexCategory(
  temperatureCelsius: number,
  relativeHumidity: number
): 'normal' | 'caution' | 'extreme_caution' | 'danger' {
  // Convert Celsius to Fahrenheit for heat index calculation
  const tempF = (temperatureCelsius * 9) / 5 + 32;

  // Simplified heat index calculation (Rothfusz equation approximation)
  const rh = relativeHumidity;

  if (tempF < 80) {
    return 'normal';
  }

  // Simplified heat index calculation for temperatures above 80°F
  let heatIndex = tempF;

  if (rh >= 40) {
    heatIndex =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * rh -
      0.22475541 * tempF * rh -
      0.00683783 * tempF * tempF -
      0.05481717 * rh * rh +
      0.00122874 * tempF * tempF * rh +
      0.00085282 * tempF * rh * rh -
      0.00000199 * tempF * tempF * rh * rh;
  }

  // Heat Index categories (in Fahrenheit)
  if (heatIndex < 90) return 'normal';
  if (heatIndex < 105) return 'caution';
  if (heatIndex < 130) return 'extreme_caution';
  return 'danger';
}

/**
 * Calculate recommended fluid increase based on climate conditions
 * @param baselineGoalMl Baseline daily hydration goal
 * @param heatIndexCategory Heat index category
 * @returns Adjusted hydration goal in milliliters
 */
export function adjustHydrationForClimate(
  baselineGoalMl: number,
  heatIndexCategory: 'normal' | 'caution' | 'extreme_caution' | 'danger'
): number {
  let adjustmentFactor = 1.0;

  switch (heatIndexCategory) {
    case 'caution':
      adjustmentFactor = 1.1; // 10% increase
      break;
    case 'extreme_caution':
      adjustmentFactor = 1.15; // 15% increase
      break;
    case 'danger':
      adjustmentFactor = 1.2; // 20% increase
      break;
    default:
      adjustmentFactor = 1.0;
  }

  return Math.round(baselineGoalMl * adjustmentFactor);
}

/**
 * Calculate fluid loss from physical activity based on ACSM guidelines
 * @param activityType Type of activity
 * @param durationMinutes Duration in minutes
 * @param intensity Activity intensity
 * @returns Estimated fluid loss in milliliters
 */
export function calculateActivityFluidLoss(
  activityType: string,
  durationMinutes: number,
  intensity: 'low' | 'moderate' | 'high' | 'very_high'
): number {
  // Fluid loss rates per minute based on intensity (mL/min)
  // Based on ACSM guidelines for sweat rates during exercise
  const lossRates = {
    low: 3, // ~180mL/hour (light walking, yoga)
    moderate: 5, // ~300mL/hour (brisk walking, light jogging)
    high: 8, // ~480mL/hour (running, cycling, tennis)
    very_high: 12, // ~720mL/hour (intense exercise, hot weather sports)
  };

  // Activity type modifiers
  const activityModifiers: Record<string, number> = {
    walking: 0.8,
    running: 1.2,
    cycling: 1.0,
    swimming: 0.7, // Less sweat due to water cooling
    yoga: 0.6,
    weightlifting: 0.9,
    tennis: 1.3,
    basketball: 1.4,
    soccer: 1.5,
    default: 1.0,
  };

  const modifier =
    activityModifiers[activityType.toLowerCase()] ||
    activityModifiers['default'];
  const baseFluidLoss = durationMinutes * lossRates[intensity];

  return Math.round(baseFluidLoss * modifier);
}

/**
 * Calculate overnight fluid loss during sleep
 * @param sleepDurationMinutes Duration of sleep in minutes
 * @returns Estimated fluid loss in milliliters
 */
export function calculateOvernightFluidLoss(
  sleepDurationMinutes: number
): number {
  // Insensible water loss during sleep: approximately 60-80mL per hour
  // Using 60mL per hour as conservative estimate
  const fluidLossPerHour = 60;
  const sleepHours = sleepDurationMinutes / 60;

  return Math.round(sleepHours * fluidLossPerHour);
}

/**
 * Get hydration status description and recommendations
 * @param progressPercentage Hydration progress percentage
 * @returns Status information and recommendations
 */
export function getHydrationStatusInfo(progressPercentage: number): {
  status:
    | 'severely_dehydrated'
    | 'dehydrated'
    | 'low'
    | 'adequate'
    | 'optimal'
    | 'over_hydrated';
  message: string;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
} {
  // Determine status
  let status:
    | 'severely_dehydrated'
    | 'dehydrated'
    | 'low'
    | 'adequate'
    | 'optimal'
    | 'over_hydrated';
  let message: string;
  let recommendations: string[];
  let urgency: 'low' | 'medium' | 'high' | 'critical';

  console.log('progressPercentage', progressPercentage);

  if (progressPercentage < 25) {
    status = 'severely_dehydrated';
    message = 'Severely dehydrated - immediate action needed';
    recommendations = [
      'Drink water immediately',
      'Consider electrolyte replacement',
      'Avoid strenuous activity',
      'Seek medical attention if symptoms persist',
    ];
    urgency = 'critical';
  } else if (progressPercentage < 50) {
    status = 'dehydrated';
    message = 'Dehydrated - increase fluid intake';
    recommendations = [
      'Drink 250-500mL of water now',
      'Set reminders to drink regularly',
      'Choose water-rich foods',
      'Limit caffeine and alcohol',
    ];
    urgency = 'high';
  } else if (progressPercentage < 75) {
    status = 'low';
    message = 'Low hydration - drink more fluids';
    recommendations = [
      'Drink 250mL of water',
      'Keep a water bottle nearby',
      'Include hydrating foods in meals',
    ];
    urgency = 'medium';
  } else if (progressPercentage < 100) {
    status = 'adequate';
    message = 'Adequate hydration - maintain current intake';
    recommendations = [
      'Continue regular fluid intake',
      'Monitor urine color as indicator',
      'Increase intake before exercise',
    ];
    urgency = 'low';
  } else if (progressPercentage <= 120) {
    status = 'optimal';
    message = 'Optimal hydration - well done!';
    recommendations = [
      'Maintain current hydration habits',
      'Adjust intake based on activity',
      'Continue monitoring daily',
    ];
    urgency = 'low';
  } else {
    status = 'over_hydrated';
    message = 'Over-hydrated - reduce fluid intake';
    recommendations = [
      'Slow down fluid intake',
      'Focus on electrolyte balance',
      'Consult healthcare provider if excessive',
    ];
    urgency = 'medium';
  }

  return {
    status,
    message,
    recommendations,
    urgency,
  };
}

/**
 * Get suggested fluid intake amounts for common scenarios
 */
export const FLUID_INTAKE_SUGGESTIONS = {
  glass_water: { amount: 250, label: '1 Glass Water' },
  bottle_water: { amount: 500, label: '1 Bottle Water' },
  cup_tea: { amount: 200, label: '1 Cup Tea/Coffee' },
  sports_drink: { amount: 350, label: '1 Sports Drink' },
  juice: { amount: 300, label: '1 Glass Juice' },
  smoothie: { amount: 400, label: '1 Smoothie' },
  soup: { amount: 250, label: '1 Bowl Soup' },
  fruits: { amount: 150, label: 'Water-rich Fruits' },
} as const;

export type FluidIntakeType = keyof typeof FLUID_INTAKE_SUGGESTIONS;

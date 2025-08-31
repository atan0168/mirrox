/**
 * Enhanced Health Metrics Calculation System
 *
 * This system implements evidence-based health calculations for digital twin visualization
 * focused on Epic 1 (Digital Twin Genesis) and Epic 2 (Living Environment Engine).
 *
 * Academic References:
 * 1. Sleep & Energy: Walker, M. (2017). "Why We Sleep" - Sleep duration impact on cognitive performance
 * 2. Air Quality & Respiratory Health: WHO Air Quality Guidelines (2021)
 * 3. PM2.5 Health Effects: Pope et al. (2002). "Lung cancer, cardiopulmonary mortality, and long-term exposure to fine particulate air pollution"
 * 4. Traffic Stress: Evans & Johnson (2000). "Stress and open-office noise"
 * 5. UV & Skin Health: Diffey (2002). "Sources and measurement of ultraviolet radiation"
 * 6. Circadian Rhythm: Roenneberg & Merrow (2016). "The Circadian Clock and Human Health"
 */

import React from 'react';
import { View, Text } from 'react-native';
import { clamp } from './mathUtils';
import InfoTable, { TableRow } from '../components/ui/InfoTable';
import { colors, fontSize, spacing } from '../theme';

// Enhanced health calculation interfaces
export interface EnvironmentalFactors {
  aqi?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  o3?: number | null;
  uvIndex?: number | null;
  temperature?: number | null;
  humidity?: number | null;
}

export interface LifestyleFactors {
  sleepHours?: number | null;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent' | null;
  commuteMode?: 'walk' | 'bike' | 'transit' | 'car' | 'wfh' | null;
  commuteDuration?: number | null; // minutes
  stressLevel?: 'none' | 'mild' | 'moderate' | 'high' | null;
  workHours?: number | null;
  exerciseMinutes?: number | null;
}

export interface HealthMetrics {
  energy: number;
  lungHealth: number;
  skinHealth: number;
  cognitiveFunction: number;
  stressIndex: number;
  overallHealth: number;
}

/**
 * Calculate energy level based on sleep duration and quality
 * Based on Walker (2017) and circadian rhythm research
 *
 * @param sleep Sleep hours (0-12)
 * @param quality Sleep quality rating
 * @param workHours Work hours for circadian adjustment
 * @returns Energy percentage (0-100)
 */
export const deriveEnergy = (
  sleep?: number | null,
  quality?: 'poor' | 'fair' | 'good' | 'excellent' | null,
  workHours?: number | null
): number => {
  if (sleep == null) return 50;

  // Base energy from sleep duration (based on sleep research)
  let baseEnergy = 0;
  if (sleep >= 9)
    baseEnergy = 95; // Optimal for most adults
  else if (sleep >= 8)
    baseEnergy = 90; // Recommended minimum
  else if (sleep >= 7)
    baseEnergy = 80; // Acceptable
  else if (sleep >= 6)
    baseEnergy = 65; // Suboptimal
  else if (sleep >= 5)
    baseEnergy = 45; // Sleep debt accumulation
  else if (sleep >= 4)
    baseEnergy = 30; // Severe impairment
  else baseEnergy = 15; // Critical sleep deprivation

  // Sleep quality modifier (±15%)
  let qualityModifier = 0;
  switch (quality) {
    case 'excellent':
      qualityModifier = 15;
      break;
    case 'good':
      qualityModifier = 5;
      break;
    case 'fair':
      qualityModifier = -5;
      break;
    case 'poor':
      qualityModifier = -15;
      break;
    default:
      qualityModifier = 0;
  }

  // Work-life balance impact (excessive work hours reduce energy)
  let workModifier = 0;
  if (workHours != null) {
    if (workHours > 10)
      workModifier = -10; // Overwork penalty
    else if (workHours > 8)
      workModifier = -5; // Standard work fatigue
    else if (workHours < 4) workModifier = 5; // Well-rested bonus
  }

  return clamp(baseEnergy + qualityModifier + workModifier, 0, 100);
};

/**
 * Calculate lung health based on comprehensive air quality metrics
 * Based on WHO Air Quality Guidelines (2021) and Pope et al. (2002)
 *
 * @param environmental Environmental factors including pollutants
 * @param lifestyle Lifestyle factors affecting respiratory health
 * @returns Lung health percentage (0-100)
 */
export const deriveLung = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): number => {
  if (!environmental) return 60;

  let lungHealth = 100; // Start with perfect health

  // Primary pollutant impacts (based on WHO guidelines)
  if (environmental.pm25 != null) {
    // PM2.5 is the most critical pollutant for lung health
    if (environmental.pm25 > 75)
      lungHealth -= 40; // Hazardous
    else if (environmental.pm25 > 55)
      lungHealth -= 30; // Very unhealthy
    else if (environmental.pm25 > 35)
      lungHealth -= 20; // Unhealthy
    else if (environmental.pm25 > 25)
      lungHealth -= 15; // Unhealthy for sensitive
    else if (environmental.pm25 > 15)
      lungHealth -= 10; // Moderate
    else if (environmental.pm25 > 5) lungHealth -= 5; // WHO guideline threshold
    // PM2.5 ≤ 5 μg/m³ is WHO recommended annual average
  }

  if (environmental.pm10 != null) {
    // PM10 additional impact
    if (environmental.pm10 > 150) lungHealth -= 15;
    else if (environmental.pm10 > 100) lungHealth -= 10;
    else if (environmental.pm10 > 50) lungHealth -= 5;
  }

  if (environmental.no2 != null) {
    // NO2 impact (traffic-related)
    if (environmental.no2 > 200)
      lungHealth -= 15; // 1-hour WHO guideline
    else if (environmental.no2 > 100) lungHealth -= 10;
    else if (environmental.no2 > 40) lungHealth -= 5; // Annual WHO guideline
  }

  if (environmental.o3 != null) {
    // Ozone impact
    if (environmental.o3 > 180) lungHealth -= 15;
    else if (environmental.o3 > 120) lungHealth -= 10;
    else if (environmental.o3 > 100) lungHealth -= 5; // WHO 8-hour guideline
  }

  // Lifestyle modifiers
  if (lifestyle?.commuteMode) {
    switch (lifestyle.commuteMode) {
      case 'walk':
      case 'bike':
        lungHealth += 5; // Exercise benefit, but outdoor exposure
        break;
      case 'wfh':
        lungHealth += 10; // Reduced pollution exposure
        break;
      case 'transit':
        lungHealth -= 2; // Some pollution exposure
        break;
      case 'car':
        lungHealth -= 5; // Higher pollution exposure in traffic
        break;
    }
  }

  // Exercise benefit for lung capacity
  if (lifestyle?.exerciseMinutes != null && lifestyle.exerciseMinutes > 0) {
    const exerciseBonus = Math.min((lifestyle.exerciseMinutes / 30) * 5, 10);
    lungHealth += exerciseBonus;
  }

  return clamp(lungHealth, 0, 100);
};

/**
 * Calculate skin health based on UV exposure, pollution, and lifestyle factors
 * Based on Diffey (2002) and dermatological research
 *
 * @param environmental Environmental factors including UV and pollution
 * @param lifestyle Lifestyle factors affecting skin health
 * @returns Skin health percentage (0-100)
 */
export const deriveSkinGlow = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): number => {
  let skinHealth = 75; // Baseline skin health

  // Sleep impact on skin regeneration (major factor)
  if (lifestyle?.sleepHours != null) {
    if (lifestyle.sleepHours >= 8)
      skinHealth += 20; // Optimal skin repair
    else if (lifestyle.sleepHours >= 7)
      skinHealth += 15; // Good repair
    else if (lifestyle.sleepHours >= 6)
      skinHealth += 5; // Minimal repair
    else if (lifestyle.sleepHours < 5) skinHealth -= 15; // Poor repair
  }

  // UV exposure impact
  if (environmental?.uvIndex != null) {
    if (environmental.uvIndex > 10)
      skinHealth -= 20; // Extreme UV
    else if (environmental.uvIndex > 7)
      skinHealth -= 15; // Very high UV
    else if (environmental.uvIndex > 5)
      skinHealth -= 10; // High UV
    else if (environmental.uvIndex > 3) skinHealth -= 5; // Moderate UV
    // Low UV (1-3) has minimal impact
  }

  // Air pollution impact on skin
  if (environmental?.pm25 != null) {
    // PM2.5 can penetrate skin and cause oxidative stress
    if (environmental.pm25 > 35) skinHealth -= 15;
    else if (environmental.pm25 > 25) skinHealth -= 10;
    else if (environmental.pm25 > 15) skinHealth -= 5;
  }

  // Commute method impact
  if (lifestyle?.commuteMode) {
    switch (lifestyle.commuteMode) {
      case 'walk':
      case 'bike':
        skinHealth += 5; // Fresh air and circulation, but UV exposure
        break;
      case 'wfh':
        skinHealth += 10; // Reduced pollution and UV exposure
        break;
      case 'transit':
        skinHealth += 2; // Some protection from elements
        break;
      case 'car':
        skinHealth -= 3; // AC and pollution exposure
        break;
    }
  }

  // Stress impact on skin
  if (lifestyle?.stressLevel) {
    switch (lifestyle.stressLevel) {
      case 'high':
        skinHealth -= 15;
        break;
      case 'moderate':
        skinHealth -= 10;
        break;
      case 'mild':
        skinHealth -= 5;
        break;
      case 'none':
        skinHealth += 5;
        break;
    }
  }

  return clamp(skinHealth, 10, 100);
};

/**
 * Calculate cognitive function based on sleep, air quality, and stress
 * Based on cognitive performance research
 *
 * @param environmental Environmental factors affecting cognition
 * @param lifestyle Lifestyle factors affecting cognitive performance
 * @returns Cognitive function percentage (0-100)
 */
export const deriveCognitiveFunction = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): number => {
  let cognitive = 80; // Baseline cognitive function

  // Sleep impact (critical for cognitive function)
  if (lifestyle?.sleepHours != null) {
    if (lifestyle.sleepHours >= 8) cognitive += 15;
    else if (lifestyle.sleepHours >= 7) cognitive += 10;
    else if (lifestyle.sleepHours >= 6) cognitive -= 5;
    else if (lifestyle.sleepHours >= 5) cognitive -= 15;
    else cognitive -= 25; // Severe cognitive impairment
  }

  // Air pollution impact on cognitive function
  if (environmental?.pm25 != null) {
    // PM2.5 can cross blood-brain barrier
    if (environmental.pm25 > 35) cognitive -= 15;
    else if (environmental.pm25 > 25) cognitive -= 10;
    else if (environmental.pm25 > 15) cognitive -= 5;
  }

  // Stress impact
  if (lifestyle?.stressLevel) {
    switch (lifestyle.stressLevel) {
      case 'high':
        cognitive -= 20;
        break;
      case 'moderate':
        cognitive -= 10;
        break;
      case 'mild':
        cognitive -= 5;
        break;
      case 'none':
        cognitive += 5;
        break;
    }
  }

  // Work hours impact
  if (lifestyle?.workHours != null) {
    if (lifestyle.workHours > 10)
      cognitive -= 15; // Mental fatigue
    else if (lifestyle.workHours > 8) cognitive -= 5;
  }

  return clamp(cognitive, 0, 100);
};

/**
 * Calculate stress index based on environmental and lifestyle factors
 * Based on Evans & Johnson (2000) and environmental psychology research
 *
 * @param environmental Environmental stressors
 * @param lifestyle Lifestyle factors affecting stress
 * @returns Stress index (0-100, where 0 is no stress, 100 is maximum stress)
 */
export const deriveStressIndex = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): number => {
  let stress = 20; // Baseline stress level

  // Traffic/commute stress
  if (lifestyle?.stressLevel) {
    switch (lifestyle.stressLevel) {
      case 'high':
        stress += 30;
        break;
      case 'moderate':
        stress += 20;
        break;
      case 'mild':
        stress += 10;
        break;
      case 'none':
        stress -= 5;
        break;
    }
  }

  // Commute duration stress
  if (lifestyle?.commuteDuration != null) {
    if (lifestyle.commuteDuration > 60)
      stress += 15; // Long commute
    else if (lifestyle.commuteDuration > 30) stress += 10;
    else if (lifestyle.commuteDuration > 15) stress += 5;
  }

  // Work hours stress
  if (lifestyle?.workHours != null) {
    if (lifestyle.workHours > 10) stress += 20;
    else if (lifestyle.workHours > 8) stress += 10;
    else if (lifestyle.workHours < 6) stress -= 5; // Work-life balance
  }

  // Sleep deprivation stress
  if (lifestyle?.sleepHours != null) {
    if (lifestyle.sleepHours < 6) stress += 15;
    else if (lifestyle.sleepHours < 7) stress += 10;
    else if (lifestyle.sleepHours >= 8) stress -= 5;
  }

  // Environmental stress (poor air quality)
  if (environmental?.aqi != null) {
    if (environmental.aqi > 200) stress += 15;
    else if (environmental.aqi > 150) stress += 10;
    else if (environmental.aqi > 100) stress += 5;
  }

  return clamp(stress, 0, 100);
};

/**
 * Calculate comprehensive health metrics
 *
 * @param environmental Environmental factors
 * @param lifestyle Lifestyle factors
 * @returns Complete health metrics object
 */
export const calculateHealthMetrics = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): HealthMetrics => {
  const energy = deriveEnergy(
    lifestyle?.sleepHours,
    lifestyle?.sleepQuality,
    lifestyle?.workHours
  );
  const lungHealth = deriveLung(environmental, lifestyle);
  const skinHealth = deriveSkinGlow(environmental, lifestyle);
  const cognitiveFunction = deriveCognitiveFunction(environmental, lifestyle);
  const stressIndex = deriveStressIndex(environmental, lifestyle);

  // Calculate overall health with weighted average
  // Energy: 25%, Lung: 30%, Skin: 15%, Cognitive: 20%, Stress: 10% (inverted)
  const overallHealth = Math.round(
    energy * 0.25 +
      lungHealth * 0.3 +
      skinHealth * 0.15 +
      cognitiveFunction * 0.2 +
      (100 - stressIndex) * 0.1
  );

  return {
    energy,
    lungHealth,
    skinHealth,
    cognitiveFunction,
    stressIndex,
    overallHealth: clamp(overallHealth, 0, 100),
  };
};

/**
 * Get detailed explanation for energy calculation
 */
export const getEnergyExplanation = (
  sleep?: number | null,
  quality?: 'poor' | 'fair' | 'good' | 'excellent' | null,
  workHours?: number | null
): React.ReactNode => {
  const rows: TableRow[] = [
    { label: '9+ hours', value: '95%', description: 'Optimal sleep duration' },
    { label: '8+ hours', value: '90%', description: 'Recommended minimum' },
    { label: '7+ hours', value: '80%', description: 'Acceptable sleep' },
    { label: '6+ hours', value: '65%', description: 'Suboptimal sleep' },
    { label: '5+ hours', value: '45%', description: 'Sleep debt building' },
    {
      label: '< 5 hours',
      value: '15-30%',
      description: 'Critical sleep deprivation',
    },
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
        Energy levels are calculated using evidence-based sleep research. Sleep
        quality and work-life balance also affect your energy.
      </Text>
      <InfoTable title="Sleep Duration → Energy" rows={rows} />
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
          No sleep data available — showing default estimate.
        </Text>
      )}
    </View>
  );
};

/**
 * Get detailed explanation for lung health calculation
 */
export const getLungExplanation = (
  environmental?: EnvironmentalFactors
): React.ReactNode => {
  const rows: TableRow[] = [
    {
      label: 'PM2.5 ≤ 5 μg/m³',
      value: '100%',
      description: 'WHO recommended level',
    },
    {
      label: 'PM2.5 5-15 μg/m³',
      value: '90-95%',
      description: 'Acceptable air quality',
    },
    {
      label: 'PM2.5 15-25 μg/m³',
      value: '80-90%',
      description: 'Moderate impact',
    },
    {
      label: 'PM2.5 25-35 μg/m³',
      value: '65-80%',
      description: 'Unhealthy for sensitive',
    },
    {
      label: 'PM2.5 > 35 μg/m³',
      value: '< 65%',
      description: 'Unhealthy air quality',
    },
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
        Lung health is calculated using WHO Air Quality Guidelines, focusing on
        PM2.5 as the primary health indicator. Other pollutants and lifestyle
        factors are also considered.
      </Text>
      <InfoTable title="PM2.5 Levels → Lung Health" rows={rows} />
      {!environmental && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.neutral[600],
            lineHeight: 20,
            marginTop: spacing.md,
            fontStyle: 'italic',
          }}
        >
          No air quality data available — showing default estimate.
        </Text>
      )}
    </View>
  );
};

/**
 * Get detailed explanation for skin health calculation
 */
export const getSkinGlowExplanation = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): React.ReactNode => {
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
        Skin health combines multiple factors: sleep quality (major impact on
        skin repair), UV exposure, air pollution, stress levels, and commute
        method. Based on dermatological research.
      </Text>
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.neutral[600],
          lineHeight: 20,
          marginTop: spacing.md,
        }}
      >
        • Sleep 8+ hours: +20 points (optimal skin repair)
        {'\n'}• High UV index ({'>'}7): -15 points (skin damage)
        {'\n'}• High PM2.5 ({'>'}35): -15 points (oxidative stress)
        {'\n'}• High stress: -15 points (affects skin health)
        {'\n'}• Work from home: +10 points (reduced exposure)
      </Text>
    </View>
  );
};

/**
 * Get detailed explanation for cognitive function calculation
 */
export const getCognitiveExplanation = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): React.ReactNode => {
  const rows: TableRow[] = [
    {
      label: 'Sleep ≥ 8h',
      value: '+15%',
      description: 'Optimal cognitive restoration',
    },
    { label: 'Sleep 7–8h', value: '+10%', description: 'Good restoration' },
    {
      label: 'Sleep 5–6h',
      value: '−15%',
      description: 'Noticeable impairment',
    },
    {
      label: 'Sleep < 5h',
      value: '−25%',
      description: 'Severe cognitive impairment',
    },
    {
      label: 'PM2.5 > 35',
      value: '−15%',
      description: 'Pollution affects brain function',
    },
    {
      label: 'High stress',
      value: '−20%',
      description: 'Stress reduces focus and memory',
    },
    {
      label: 'Work > 10h',
      value: '−15%',
      description: 'Mental fatigue from overwork',
    },
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
        Cognitive function reflects sleep quality, air quality, and stress.
        Adequate sleep and lower stress improve focus and reaction, while
        pollution and overwork can reduce performance.
      </Text>
      <InfoTable title="Factors → Cognitive Change" rows={rows} />
    </View>
  );
};

/**
 * Get detailed explanation for stress index calculation
 */
export const getStressExplanation = (
  environmental?: EnvironmentalFactors,
  lifestyle?: LifestyleFactors
): React.ReactNode => {
  const rows: TableRow[] = [
    { label: 'Baseline', value: '20', description: 'Starting stress level' },
    {
      label: 'Commute > 60m',
      value: '+15',
      description: 'Long commute adds stress',
    },
    {
      label: 'Work > 10h',
      value: '+20',
      description: 'Overwork increases stress',
    },
    { label: 'Sleep < 6h', value: '+15', description: 'Sleep deprivation' },
    { label: 'AQI > 100', value: '+5–15', description: 'Poor air quality' },
    {
      label: 'Low stress day',
      value: '−5',
      description: 'Good habits reduce stress',
    },
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
        Stress index combines commute conditions, work hours, sleep, and
        environmental quality. Lower values are better and reflect calmer
        conditions.
      </Text>
      <InfoTable title="Contributors → Stress Index" rows={rows} />
    </View>
  );
};

export const calculateOverallHealth = (
  energy: number,
  lung: number,
  skin: number
): number => {
  // Legacy calculation for backward compatibility
  const weighted = energy * 0.4 + lung * 0.35 + skin * 0.25;
  return Math.round(clamp(weighted, 0, 100));
};

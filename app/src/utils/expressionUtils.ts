// Combined facial expression logic for simple health/environment factors

type Inputs = {
  aqi?: number | null;
  pm25?: number | null;
  sleepMinutes?: number | null;
};

// A simple severity ordering to decide priority when factors disagree
const severityRank: Record<string, number> = {
  calm: 0,
  neutral: 1,
  concerned: 2,
  upset: 3,
  tired: 3,
  sick: 4,
  exhausted: 5,
};

const clampKnown = (expr: string): keyof typeof severityRank => {
  return (
    severityRank[expr] !== undefined ? expr : 'neutral'
  ) as keyof typeof severityRank;
};

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
  // Use PM2.5 as primary indicator, fallback to AQI with conversion
  let effectiveValue = 0;

  if (pm25 !== null && pm25 !== undefined) {
    effectiveValue = pm25;
  } else if (aqi !== null && aqi !== undefined) {
    // Convert AQI to estimated PM2.5 for consistent thresholds
    if (aqi <= 50) {
      effectiveValue = aqi * 0.24; // ~12 µg/m³ at AQI 50
    } else if (aqi <= 100) {
      effectiveValue = 12 + (aqi - 50) * 0.46; // ~35 µg/m³ at AQI 100
    } else if (aqi <= 150) {
      effectiveValue = 35 + (aqi - 100) * 0.4; // ~55 µg/m³ at AQI 150
    } else {
      effectiveValue = 55 + (aqi - 150) * 0.95;
    }
  }

  // Progressive frowning as air quality worsens
  if (effectiveValue <= 12) {
    return 'calm'; // Good air quality - happy/calm expression
  } else if (effectiveValue <= 25) {
    return 'neutral'; // Moderate air quality - neutral expression
  } else if (effectiveValue <= 55) {
    return 'concerned'; // Moderate to unhealthy - start showing concern
  } else if (effectiveValue <= 100) {
    return 'upset'; // Unhealthy for sensitive groups - displeased/upset (not tired)
  } else {
    return 'sick'; // Very unhealthy - sick expression
  }
}

/**
 * Returns a recommended expression from AQI/PM2.5 and sleep minutes.
 * - Bad air quality -> concerned/sick/exhausted
 * - Not enough sleep -> tired/exhausted
 * Chooses the more severe between air and sleep.
 */
export function getCombinedRecommendedExpression({
  aqi,
  pm25,
  sleepMinutes,
}: Inputs): string {
  // Air-quality-driven expression
  const airExpr = clampKnown(
    getRecommendedFacialExpression(pm25 ?? null, aqi ?? null)
  );

  // Sleep-driven expression
  let sleepExpr: keyof typeof severityRank = 'neutral';
  if (typeof sleepMinutes === 'number' && sleepMinutes > 0) {
    const hours = sleepMinutes / 60;
    if (hours < 4) sleepExpr = 'exhausted';
    else if (hours < 6) sleepExpr = 'tired';
    else if (hours >= 8.5) sleepExpr = 'calm';
    else sleepExpr = 'neutral';
  }

  // Choose the more severe outcome (higher severityRank)
  const pick =
    severityRank[airExpr] >= severityRank[sleepExpr] ? airExpr : sleepExpr;
  return pick;
}

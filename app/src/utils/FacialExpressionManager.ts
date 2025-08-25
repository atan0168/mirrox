/**
 * Facial Expression Manager
 * 
 * This utility provides intelligent facial expression selection based on:
 * - Health metrics (air quality, sleep, symptoms)
 * - Environmental factors
 * - User inputs
 */

export interface HealthMetrics {
  airQualityIndex?: number;
  sleepHours?: number;
  symptoms?: string[];
  energyLevel?: number; // 1-10 scale
  stressLevel?: number; // 1-10 scale
  respiratorySymptoms?: boolean;
}

export interface ExpressionRecommendation {
  primaryExpression: string;
  alternativeExpressions: string[];
  confidence: number; // 0-1 scale
  reasoning: string;
}

export class FacialExpressionManager {
  private static readonly EXPRESSION_WEIGHTS = {
    // Health-based weights
    airQuality: 0.3,
    sleep: 0.25,
    symptoms: 0.35,
    energy: 0.2,
    stress: 0.15,
  };

  private static readonly AQI_THRESHOLDS = {
    good: 50,
    moderate: 100,
    unhealthy_sensitive: 150,
    unhealthy: 200,
    very_unhealthy: 300,
  };

  private static readonly SLEEP_THRESHOLDS = {
    well_rested: 7,
    adequate: 6,
    tired: 5,
    exhausted: 4,
  };

  /**
   * Analyzes health metrics and recommends appropriate facial expression
   */
  static analyzeHealthAndRecommendExpression(
    metrics: HealthMetrics
  ): ExpressionRecommendation {
    const scores = this.calculateExpressionScores(metrics);
    const topExpression = this.getTopExpression(scores);
    
    return {
      primaryExpression: topExpression.expression,
      alternativeExpressions: this.getAlternatives(scores, topExpression.expression),
      confidence: topExpression.score,
      reasoning: this.generateReasoning(metrics, topExpression.expression),
    };
  }

  /**
   * Calculate weighted scores for each expression based on health metrics
   */
  private static calculateExpressionScores(metrics: HealthMetrics): { [key: string]: number } {
    const scores: { [key: string]: number } = {
      healthy: 0,
      mild_symptoms: 0,
      tired: 0,
      breathing_difficulty: 0,
      coughing: 0,
      sick: 0,
      exhausted: 0,
      concerned: 0,
      neutral: 0.1, // baseline
    };

    // Air Quality Impact
    if (metrics.airQualityIndex !== undefined) {
      const aqi = metrics.airQualityIndex;
      if (aqi <= this.AQI_THRESHOLDS.good) {
        scores.healthy += 0.4;
        scores.calm += 0.2;
      } else if (aqi <= this.AQI_THRESHOLDS.moderate) {
        scores.mild_symptoms += 0.3;
        scores.neutral += 0.2;
      } else if (aqi <= this.AQI_THRESHOLDS.unhealthy_sensitive) {
        scores.concerned += 0.4;
        scores.breathing_difficulty += 0.3;
      } else if (aqi <= this.AQI_THRESHOLDS.unhealthy) {
        scores.breathing_difficulty += 0.5;
        scores.sick += 0.3;
      } else {
        scores.sick += 0.6;
        scores.breathing_difficulty += 0.4;
      }
    }

    // Sleep Impact
    if (metrics.sleepHours !== undefined) {
      const sleep = metrics.sleepHours;
      if (sleep >= this.SLEEP_THRESHOLDS.well_rested) {
        scores.healthy += 0.3;
        scores.calm += 0.2;
      } else if (sleep >= this.SLEEP_THRESHOLDS.adequate) {
        scores.neutral += 0.2;
      } else if (sleep >= this.SLEEP_THRESHOLDS.tired) {
        scores.tired += 0.4;
        scores.mild_symptoms += 0.2;
      } else {
        scores.exhausted += 0.5;
        scores.tired += 0.3;
      }
    }

    // Symptoms Impact
    if (metrics.symptoms && metrics.symptoms.length > 0) {
      metrics.symptoms.forEach(symptom => {
        const symptomLower = symptom.toLowerCase();
        if (symptomLower.includes('cough')) {
          scores.coughing += 0.6;
          scores.breathing_difficulty += 0.3;
        }
        if (symptomLower.includes('breath') || symptomLower.includes('wheez')) {
          scores.breathing_difficulty += 0.5;
        }
        if (symptomLower.includes('headache') || symptomLower.includes('nausea')) {
          scores.sick += 0.4;
        }
        if (symptomLower.includes('fatigue') || symptomLower.includes('tired')) {
          scores.tired += 0.4;
          scores.exhausted += 0.2;
        }
      });
    }

    // Energy Level Impact
    if (metrics.energyLevel !== undefined) {
      const energy = metrics.energyLevel;
      if (energy >= 8) {
        scores.healthy += 0.3;
        scores.happy += 0.2;
      } else if (energy >= 6) {
        scores.neutral += 0.2;
        scores.calm += 0.1;
      } else if (energy >= 4) {
        scores.tired += 0.3;
        scores.mild_symptoms += 0.2;
      } else {
        scores.exhausted += 0.4;
        scores.sick += 0.2;
      }
    }

    // Stress Level Impact
    if (metrics.stressLevel !== undefined) {
      const stress = metrics.stressLevel;
      if (stress <= 3) {
        scores.calm += 0.2;
        scores.happy += 0.1;
      } else if (stress <= 6) {
        scores.neutral += 0.1;
      } else {
        scores.concerned += 0.3;
        scores.tired += 0.2;
      }
    }

    // Respiratory Symptoms Flag
    if (metrics.respiratorySymptoms) {
      scores.breathing_difficulty += 0.4;
      scores.coughing += 0.3;
      scores.concerned += 0.2;
    }

    return scores;
  }

  /**
   * Get the expression with the highest score
   */
  private static getTopExpression(scores: { [key: string]: number }): { expression: string; score: number } {
    let topExpression = 'neutral';
    let topScore = scores.neutral || 0;

    Object.entries(scores).forEach(([expression, score]) => {
      if (score > topScore) {
        topScore = score;
        topExpression = expression;
      }
    });

    return { expression: topExpression, score: Math.min(topScore, 1) };
  }

  /**
   * Get alternative expressions sorted by score
   */
  private static getAlternatives(scores: { [key: string]: number }, primaryExpression: string): string[] {
    return Object.entries(scores)
      .filter(([expression]) => expression !== primaryExpression)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([expression]) => expression);
  }

  /**
   * Generate human-readable reasoning for the expression choice
   */
  private static generateReasoning(metrics: HealthMetrics, expression: string): string {
    const factors = [];

    if (metrics.airQualityIndex !== undefined) {
      const aqi = metrics.airQualityIndex;
      if (aqi > this.AQI_THRESHOLDS.unhealthy_sensitive) {
        factors.push(`poor air quality (AQI: ${aqi})`);
      } else if (aqi > this.AQI_THRESHOLDS.moderate) {
        factors.push(`moderate air quality (AQI: ${aqi})`);
      }
    }

    if (metrics.sleepHours !== undefined && metrics.sleepHours < 6) {
      factors.push(`insufficient sleep (${metrics.sleepHours}h)`);
    }

    if (metrics.symptoms && metrics.symptoms.length > 0) {
      factors.push(`reported symptoms: ${metrics.symptoms.join(', ')}`);
    }

    if (metrics.energyLevel !== undefined && metrics.energyLevel < 5) {
      factors.push(`low energy level (${metrics.energyLevel}/10)`);
    }

    if (metrics.stressLevel !== undefined && metrics.stressLevel > 7) {
      factors.push(`high stress level (${metrics.stressLevel}/10)`);
    }

    if (factors.length === 0) {
      return `Healthy baseline expression based on good overall metrics`;
    }

    return `Expression based on: ${factors.join(', ')}`;
  }

  /**
   * Get expression for specific air quality conditions
   */
  static getExpressionForAirQuality(aqi: number): string {
    if (aqi <= this.AQI_THRESHOLDS.good) return 'healthy';
    if (aqi <= this.AQI_THRESHOLDS.moderate) return 'neutral';
    if (aqi <= this.AQI_THRESHOLDS.unhealthy_sensitive) return 'mild_symptoms';
    if (aqi <= this.AQI_THRESHOLDS.unhealthy) return 'breathing_difficulty';
    return 'sick';
  }

  /**
   * Get expression based on sleep patterns
   */
  static getExpressionForSleep(hours: number): string {
    if (hours >= this.SLEEP_THRESHOLDS.well_rested) return 'healthy';
    if (hours >= this.SLEEP_THRESHOLDS.adequate) return 'neutral';
    if (hours >= this.SLEEP_THRESHOLDS.tired) return 'tired';
    return 'exhausted';
  }

  /**
   * Blend two expressions with a weight (for smooth transitions)
   */
  static blendExpressions(
    expression1: string,
    expression2: string,
    weight: number // 0 = full expression1, 1 = full expression2
  ): { [key: string]: number } {
    // This would require access to the FACIAL_EXPRESSIONS mapping
    // For now, return the primary expression
    // In a full implementation, this would interpolate between morph targets
    return {};
  }
}

// Convenience functions for quick expression selection
export const getHealthExpression = (metrics: HealthMetrics): string => {
  return FacialExpressionManager.analyzeHealthAndRecommendExpression(metrics).primaryExpression;
};

export const getAirQualityExpression = (aqi: number): string => {
  return FacialExpressionManager.getExpressionForAirQuality(aqi);
};

export const getSleepExpression = (hours: number): string => {
  return FacialExpressionManager.getExpressionForSleep(hours);
};

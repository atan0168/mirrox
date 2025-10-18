export type NutritionStatus = 'low' | 'ok' | 'high';
export type NutritionTone = 'info' | 'success' | 'warning';

export interface NutritionAspect {
  id: string;
  title: string;
  status: NutritionStatus;
  tone: NutritionTone;
  short: string; // single-line summary
  detail: string; // slightly longer rationale
  tips: string[]; // actionable food/snack examples
}

export interface Footnote {
  id: string;
  text: string;
}

export interface NutritionRecommendationsResult {
  aspects: NutritionAspect[];
  footnotes: Footnote[];
  amdr: {
    carbs: { min: number; max: number };
    protein: { min: number; max: number };
    fat: { min: number; max: number };
  };
  macroPct: { carbsPct: number; proteinPct: number; fatPct: number };
}

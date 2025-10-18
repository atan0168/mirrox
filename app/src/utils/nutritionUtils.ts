import {
  AnalyzeFoodResponseData,
  AnalyzeSource,
  ItemNutrient,
} from '../services/BackendApiService';
import type { MealItem } from '../types/meal';
import type { UserProfile } from '../models/User';

export const NUTRIENT_KEYS = [
  'energy_kcal',
  'sugar_g',
  'fiber_g',
  'fat_g',
  'sodium_mg',
  'sat_fat_g',
  'protein_g',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export function getMealItemMeta(
  item: MealItem
): Partial<ItemNutrient> | undefined {
  if (!item.meta || typeof item.meta !== 'object') {
    return undefined;
  }
  return item.meta as Partial<ItemNutrient>;
}

export function safeNumeric(value?: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function resolveMealItemName(item: MealItem): string {
  const meta = getMealItemMeta(item);
  return (
    meta?.name ||
    meta?.display_name ||
    item.name ||
    (meta?.id ? String(meta.id) : 'Food')
  );
}

export function getMealItemPortionText(item: MealItem): string | null {
  const meta = getMealItemMeta(item);
  const raw = meta?.portion_text;

  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getMealItemModifiers(item: MealItem): string[] {
  const meta = getMealItemMeta(item);
  const value = meta?.modifiers;

  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return value
    .map(modifier => (typeof modifier === 'string' ? modifier.trim() : ''))
    .filter(modifier => modifier.length > 0);
}

export function getMealItemSource(item: MealItem): string | null {
  const meta = getMealItemMeta(item);
  const source = typeof meta?.source === 'string' ? meta.source.trim() : '';
  return source.length > 0 ? source : null;
}

const FALLBACK_SOURCE_LABELS: Record<string, string> = {
  myfcd: 'MyFCD',
  usda: 'USDA',
  usda_sr: 'USDA SR',
  local: 'Curated',
};

function formatSourceToken(token: string): string {
  if (!token) {
    return '';
  }

  if (/^[A-Z0-9]+$/.test(token)) {
    return token;
  }

  if (token.length <= 3) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1);
}

function formatSourceFallback(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase();
  const known = FALLBACK_SOURCE_LABELS[normalized];
  if (known) {
    return known;
  }

  const parts = trimmed
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(token => {
      const lower = token.toLowerCase();
      const fallback = FALLBACK_SOURCE_LABELS[lower];
      if (fallback) {
        return fallback;
      }
      return formatSourceToken(token);
    });

  return parts.join(' ');
}

export function resolveSourceLabel(
  sourceKey: string | null | undefined,
  sources?: AnalyzeSource[]
): string | null {
  if (!sourceKey) {
    return null;
  }

  const trimmed = sourceKey.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();

  const fromList = (sources ?? []).find(entry => {
    const key = entry.key?.trim().toLowerCase();
    return key === normalized;
  });

  const labelCandidate = fromList?.label?.trim();
  if (labelCandidate) {
    return labelCandidate;
  }

  const known = FALLBACK_SOURCE_LABELS[normalized];
  if (known) {
    return known;
  }

  if (fromList?.key?.trim()) {
    return formatSourceFallback(fromList.key);
  }

  return formatSourceFallback(trimmed);
}

export function getMealItemNutrientPerItem(
  item: MealItem,
  key: NutrientKey
): number | null {
  const meta = getMealItemMeta(item);
  const metaValue = meta
    ? safeNumeric(
        (meta as Partial<Record<NutrientKey, number | null>>)[key] ?? null
      )
    : null;

  if (metaValue != null) {
    return metaValue;
  }

  if (key === 'energy_kcal') {
    return safeNumeric(item.energy_kcal ?? null);
  }

  return null;
}

export function getMealItemNutrientTotal(
  item: MealItem,
  key: NutrientKey
): number | null {
  const perItem = getMealItemNutrientPerItem(item, key);
  if (perItem == null) {
    return null;
  }

  const qty = item.qty ?? 1;
  return perItem * qty;
}

export function formatNutrientValue(
  value: number | null,
  unit: string,
  decimals: number
): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }

  if (decimals === 0) {
    return `${Math.round(value)} ${unit}`;
  }

  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return `${rounded.toFixed(decimals)} ${unit}`;
}

function multiplyValue(value: number | null, qty: number): number | undefined {
  if (value == null) return undefined;
  return value * qty;
}

export function toItemNutrient(item: MealItem): ItemNutrient {
  const meta = getMealItemMeta(item);
  const qty = item.qty ?? 1;
  const energyBase =
    safeNumeric(meta?.energy_kcal ?? item.energy_kcal ?? null) ?? null;
  const portionCandidate =
    typeof meta?.portion_text === 'string' ? meta?.portion_text : undefined;
  const portionText =
    portionCandidate && portionCandidate.trim().length > 0
      ? portionCandidate.trim()
      : null;
  const modifierCandidate = Array.isArray(meta?.modifiers)
    ? (meta?.modifiers as string[])
    : undefined;
  const modifiers = modifierCandidate
    ? modifierCandidate
        .map(modifier => modifier.trim())
        .filter(modifier => modifier.length > 0)
    : [];

  return {
    id: meta?.id ?? String(item.id),
    display_name: meta?.display_name,
    name: meta?.name ?? item.name,
    source: meta?.source,
    portion_text: portionText,
    modifiers,
    energy_kcal: multiplyValue(energyBase, qty),
    sugar_g: multiplyValue(safeNumeric(meta?.sugar_g ?? null), qty),
    fiber_g: multiplyValue(safeNumeric(meta?.fiber_g ?? null), qty),
    fat_g: multiplyValue(safeNumeric(meta?.fat_g ?? null), qty),
    sodium_mg: multiplyValue(safeNumeric(meta?.sodium_mg ?? null), qty),
    sat_fat_g: multiplyValue(safeNumeric(meta?.sat_fat_g ?? null), qty),
    protein_g: multiplyValue(safeNumeric(meta?.protein_g ?? null), qty),
  };
}

export function buildMealAnalysisFromItems(
  items: MealItem[] | undefined,
  base?: AnalyzeFoodResponseData
): AnalyzeFoodResponseData | undefined {
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    return base;
  }

  const perItem = safeItems.map(toItemNutrient);

  const total = NUTRIENT_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<NutrientKey, number>
  );

  for (const entry of perItem) {
    for (const key of NUTRIENT_KEYS) {
      const value = entry[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        total[key] += value;
      }
    }
  }

  return {
    tags: base?.tags ?? [],
    tags_display: base?.tags_display,
    tips: base?.tips ?? [],
    sources: base?.sources,
    nutrients: {
      total,
      per_item: perItem,
    },
    canonical: perItem,
  };
}

interface CalorieGoalDefaults {
  gender: UserProfile['gender'] | 'unknown';
  weightKg: number;
  heightCm: number;
  goal: number;
}

const DEFAULT_CALORIE_TARGETS: CalorieGoalDefaults[] = [
  { gender: 'male', weightKg: 78, heightCm: 178, goal: 2500 },
  { gender: 'female', weightKg: 62, heightCm: 165, goal: 2000 },
  { gender: 'unknown', weightKg: 70, heightCm: 170, goal: 2200 },
];

export type CalorieGoalMethod = 'profile' | 'gender' | 'default';

export function estimateDailyCalorieGoal(profile?: UserProfile | null): {
  goal: number;
  method: CalorieGoalMethod;
  assumedAge: number;
} {
  const assumedAge = 30; // Age not captured yet; use adult baseline for Mifflin-St Jeor
  const gender = profile?.gender ?? 'unknown';

  const defaults =
    DEFAULT_CALORIE_TARGETS.find(entry => entry.gender === gender) ??
    DEFAULT_CALORIE_TARGETS.find(entry => entry.gender === 'unknown')!;

  const hasAnthropometrics =
    typeof profile?.weightKg === 'number' &&
    profile.weightKg > 0 &&
    typeof profile.heightCm === 'number' &&
    profile.heightCm > 0;

  const activityFactor = 1.45; // Lightly active baseline (sedentary + incidental activity)

  if (
    hasAnthropometrics &&
    profile?.gender &&
    profile?.weightKg &&
    profile?.heightCm
  ) {
    const sexConstant = profile.gender === 'male' ? 5 : -161;
    const bmr =
      10 * profile.weightKg +
      6.25 * profile.heightCm -
      5 * assumedAge +
      sexConstant;
    const goal = clampCalorieGoal(Math.round(bmr * activityFactor));
    return { goal, method: 'profile', assumedAge };
  }

  if (profile?.gender) {
    const sexConstant = profile.gender === 'male' ? 5 : -161;
    const bmr =
      10 * defaults.weightKg +
      6.25 * defaults.heightCm -
      5 * assumedAge +
      sexConstant;
    const goal = clampCalorieGoal(Math.round(bmr * activityFactor));
    return { goal, method: 'gender', assumedAge };
  }

  // Gender unknown: fall back to general adult average needs
  const neutralBmr =
    10 * defaults.weightKg + 6.25 * defaults.heightCm - 5 * assumedAge;
  const neutralGoal = clampCalorieGoal(
    Math.round(neutralBmr * (activityFactor - 0.05))
  );
  return { goal: neutralGoal, method: 'default', assumedAge };
}

function clampCalorieGoal(goal: number): number {
  return Math.min(3500, Math.max(1200, goal));
}

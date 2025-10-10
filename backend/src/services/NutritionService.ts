import fs from 'fs';
import path from 'path';
import { searchFoods, getFoodById } from './FoodService';
import { prettyName } from '../utils/displayName';

export type Nutrients = {
  energy_kcal: number;
  carb_g: number;
  sugar_g: number;
  fat_g: number;
  sat_fat_g: number;
  protein_g: number;
  fiber_g: number;
  sodium_mg: number;
};

export type FoodEntry = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string;
  default_portion?: {
    unit: string;
    grams?: number;
    ml?: number;
  } | null;
  nutrients_per_100g?: Partial<Nutrients> | null;
  nutrients_per_100ml?: Partial<Nutrients> | null;
  modifiers?: Record<string, unknown> | null;
};

export type CanonicalItem = {
  id: string;
  name: string;
  quantity?: number;
  portion_g?: number;
  volume_ml?: number;
  modifier_keys?: string[];
  confidence?: number;
};

export type AnalyzeInput = { text?: string; imageBase64?: string };
export type ExtractFn = (
  p: AnalyzeInput
) => Promise<{ FOOD_ITEM?: string[]; DRINK_ITEM?: string[] }>;

type PortionSizeKey = 'small' | 'medium' | 'large';
type PortionUnitEntry = Record<string, number | boolean | undefined>;
type PortionUnitsConfig = Record<string, PortionUnitEntry | undefined> & {
  small_medium_large_factors?: Record<PortionSizeKey, number>;
};

type MacronutrientRange = [number, number];
type MacroBalanceRanges = {
  carb_pct: MacronutrientRange;
  fat_pct: MacronutrientRange;
  protein_pct: MacronutrientRange;
};

interface NutritionThresholds {
  high_sugar_g: number;
  high_fat_g: number;
  high_sat_fat_g: number;
  low_fiber_g: number;
  high_sodium_mg: number;
  balance_ranges: MacroBalanceRanges;
}

type FeedbackTipEntry = {
  en: string;
  zh?: string;
  [lang: string]: string | undefined;
};
type FeedbackTips = Record<string, FeedbackTipEntry[]>;
type FeedbackMapEntry = Record<string, unknown>;
type FeedbackMap = Record<string, FeedbackMapEntry>;

const SETTINGS_SEARCH_PATHS: string[] = [
  path.resolve(__dirname, '..', 'settings'),
  path.resolve(__dirname, '..', '..', 'src', 'settings'),
  path.resolve(process.cwd(), 'src', 'settings'),
  path.resolve(process.cwd(), 'dist', 'settings'),
];

const settingsCache = new Map<string, unknown>();

const resolveSettingsFile = (filename: string): string | null => {
  for (const basePath of SETTINGS_SEARCH_PATHS) {
    const candidate = path.resolve(basePath, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const readSettingsJSON = <T>(filename: string, fallback?: T): T => {
  if (settingsCache.has(filename)) {
    return settingsCache.get(filename) as T;
  }

  const filePath = resolveSettingsFile(filename);
  if (!filePath) {
    if (fallback !== undefined) {
      settingsCache.set(filename, fallback);
      return fallback;
    }
    throw new Error(`Settings file not found: ${filename}`);
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContents) as T;
  settingsCache.set(filename, parsed);
  return parsed;
};

const UNIT = readSettingsJSON<PortionUnitsConfig>('portion.units.json');
const TH = readSettingsJSON<NutritionThresholds>('nutrition.thresholds.json');
const TIPS = readSettingsJSON<FeedbackTips>('feedback.tips.json', {});
const FBMAP = readSettingsJSON<FeedbackMap>('feedback.map.json', {});

type NPart = Partial<Nutrients>;

const DEFAULT_SIZE_FACTORS: Record<PortionSizeKey, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
};

const SIZE_FACTORS: Record<PortionSizeKey, number> = {
  small: UNIT.small_medium_large_factors?.small ?? DEFAULT_SIZE_FACTORS.small,
  medium: UNIT.small_medium_large_factors?.medium ?? DEFAULT_SIZE_FACTORS.medium,
  large: UNIT.small_medium_large_factors?.large ?? DEFAULT_SIZE_FACTORS.large,
};

const QTY_RE = /(\d+)\s*(x|个|只|份|pieces?|pcs?)?/i;
const UWORDS = [
  { unit: 'bowl', re: /\b(bowl|碗|mangkuk)\b/i },
  { unit: 'cup', re: /\b(cup|杯)\b/i },
  { unit: 'plate', re: /\b(plate|盘|碟)\b/i },
  { unit: 'slice', re: /\b(slice|片)\b/i },
  { unit: 'piece', re: /\b(piece|个|只|份)\b/i },
];
const SWORDS = [
  { size: 'large', re: /\b(large|大杯|大份)\b/i },
  { size: 'small', re: /\b(small|小杯|小份)\b/i },
];
const SUGAR_KEYWORDS: Array<{ token: string; key: string }> = [
  { token: 'kurang manis', key: 'kurang manis' },
  { token: 'less sugar', key: 'less sugar' },
  { token: 'no sugar', key: 'no sugar' },
];

const DEFAULT_CONFIDENCE = 0.9;

const zero = (): Nutrients => ({
  energy_kcal: 0,
  carb_g: 0,
  sugar_g: 0,
  fat_g: 0,
  sat_fat_g: 0,
  protein_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
});

const sum = (a: Nutrients, b: NPart): Nutrients => ({
  energy_kcal: a.energy_kcal + (b.energy_kcal ?? 0),
  carb_g: a.carb_g + (b.carb_g ?? 0),
  sugar_g: a.sugar_g + (b.sugar_g ?? 0),
  fat_g: a.fat_g + (b.fat_g ?? 0),
  sat_fat_g: a.sat_fat_g + (b.sat_fat_g ?? 0),
  protein_g: a.protein_g + (b.protein_g ?? 0),
  fiber_g: a.fiber_g + (b.fiber_g ?? 0),
  sodium_mg: a.sodium_mg + (b.sodium_mg ?? 0),
});

const scale = (n: NPart, f: number): Nutrients => ({
  energy_kcal: (n.energy_kcal ?? 0) * f,
  carb_g: (n.carb_g ?? 0) * f,
  sugar_g: (n.sugar_g ?? 0) * f,
  fat_g: (n.fat_g ?? 0) * f,
  sat_fat_g: (n.sat_fat_g ?? 0) * f,
  protein_g: (n.protein_g ?? 0) * f,
  fiber_g: (n.fiber_g ?? 0) * f,
  sodium_mg: (n.sodium_mg ?? 0) * f,
});

const hasNutrientData = (data?: NPart | null): data is NPart =>
  !!data && Object.keys(data).length > 0;

const getUnitCategoryValue = (
  unitKey: string | undefined,
  category: string | undefined
): number | undefined => {
  if (!unitKey || !category) return undefined;
  const unitEntry = UNIT[unitKey];
  if (!unitEntry) return undefined;
  const value = unitEntry[category];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const getSugarFactor = (
  modifiers: FoodEntry['modifiers'] | undefined,
  key: string
): number | undefined => {
  if (!modifiers) return undefined;
  const raw = modifiers[key];
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = (raw as Record<string, unknown>).sugar_factor;
  return typeof candidate === 'number' ? candidate : undefined;
};

function findFoodFromDB(raw: string): FoodEntry | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const q = trimmed.toLowerCase();
  const hit = searchFoods(q, 1)[0];
  if (!hit) return undefined;

  const full = getFoodById(hit.id);
  if (!full) return undefined;

  const entry: FoodEntry = {
    id: full.id,
    name: full.name,
    aliases: full.aliases || [],
    nutrients_per_100g: full.nutrients_per_100g || null,
    nutrients_per_100ml: full.nutrients_per_100ml || null,
    modifiers: (full.modifiers as FoodEntry['modifiers']) || null,
  };

  if (full.category) {
    entry.category = full.category;
  }

  if (full.default_portion) {
    entry.default_portion = full.default_portion;
  }

  return entry;
}

function applyPortionAndModifiers(
  food: FoodEntry,
  text: string,
  cachedLowerText?: string
): CanonicalItem {
  const lowered = cachedLowerText ?? text.toLowerCase();
  const quantityMatch = QTY_RE.exec(lowered);
  const parsedQuantity = quantityMatch ? parseInt(quantityMatch[1] ?? '', 10) : NaN;
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  const size =
    (SWORDS.find(x => x.re.test(lowered))?.size as PortionSizeKey | undefined) ?? 'medium';
  const sizeFactor = SIZE_FACTORS[size] ?? DEFAULT_SIZE_FACTORS[size];

  const hit = UWORDS.find(x => x.re.test(lowered))?.unit;
  const modifierKeys = SUGAR_KEYWORDS.filter(({ token }) => lowered.includes(token)).map(
    ({ key }) => key
  );

  let portion_g: number | undefined;
  let volume_ml: number | undefined;
  const unitCategoryValue = getUnitCategoryValue(hit, food.category);

  if (hasNutrientData(food.nutrients_per_100g)) {
    if (unitCategoryValue != null) {
      portion_g = Math.round(unitCategoryValue * sizeFactor) * quantity;
    } else if (food.default_portion?.grams) {
      portion_g = Math.round(food.default_portion.grams * sizeFactor) * quantity;
    } else {
      portion_g = 100 * quantity;
    }
  } else if (hasNutrientData(food.nutrients_per_100ml)) {
    if (unitCategoryValue != null) {
      volume_ml = Math.round(unitCategoryValue * sizeFactor) * quantity;
    } else if (food.default_portion?.ml) {
      volume_ml = Math.round(food.default_portion.ml * sizeFactor) * quantity;
    } else {
      volume_ml = 250 * quantity;
    }
  }

  const item: CanonicalItem = {
    id: food.id,
    name: prettyName(food.name, food.aliases),
    quantity,
    confidence: DEFAULT_CONFIDENCE,
  };

  if (portion_g != null) {
    item.portion_g = portion_g;
  }

  if (volume_ml != null) {
    item.volume_ml = volume_ml;
  }

  if (modifierKeys.length) {
    item.modifier_keys = modifierKeys;
  }

  return item;
}

function computeItemNutrients(food: FoodEntry, item: CanonicalItem): Nutrients {
  let r = zero();

  if (food.nutrients_per_100g && item.portion_g) {
    r = sum(r, scale(food.nutrients_per_100g, item.portion_g / 100));
  }

  if (food.nutrients_per_100ml && item.volume_ml) {
    r = sum(r, scale(food.nutrients_per_100ml, item.volume_ml / 100));
  }

  for (const key of item.modifier_keys || []) {
    const sugarFactor = getSugarFactor(food.modifiers, key);
    if (sugarFactor != null) {
      r.sugar_g *= sugarFactor;
    }
  }

  if (!r.energy_kcal) {
    r.energy_kcal = r.carb_g * 4 + r.protein_g * 4 + r.fat_g * 9;
  }
  return r;
}

function computeAll(pairs: Array<{ food: FoodEntry; item: CanonicalItem }>) {
  const per_item = pairs.map(({ food, item }) => {
    const nutrients = computeItemNutrients(food, item);
    const displayName = item.name || prettyName(food.name, food.aliases);
    return {
      ...nutrients,
      id: item.id,
      name: displayName,
      display_name: displayName,
    };
  });
  const total = per_item.reduce<Nutrients>((acc, n) => sum(acc, n), zero());
  return { per_item, total };
}

function classify(total: Nutrients): string[] {
  const tags: string[] = [];
  if (total.sugar_g >= TH.high_sugar_g) tags.push('high_sugar');
  if (total.fat_g >= TH.high_fat_g || total.sat_fat_g >= TH.high_sat_fat_g)
    tags.push('high_fat');
  if (total.fiber_g < TH.low_fiber_g) tags.push('low_fiber');
  if (total.sodium_mg >= TH.high_sodium_mg) tags.push('high_sodium');

  const kcal =
    total.energy_kcal ||
    total.carb_g * 4 + total.protein_g * 4 + total.fat_g * 9;
  if (kcal > 0) {
    const carbPct = ((total.carb_g * 4) / kcal) * 100;
    const fatPct = ((total.fat_g * 9) / kcal) * 100;
    const proteinPct = ((total.protein_g * 4) / kcal) * 100;
    const inRange = (r: MacronutrientRange, v: number) => v >= r[0] && v <= r[1];
    if (
      !(
        inRange(TH.balance_ranges.carb_pct, carbPct) &&
        inRange(TH.balance_ranges.fat_pct, fatPct) &&
        inRange(TH.balance_ranges.protein_pct, proteinPct)
      )
    ) {
      tags.push('unbalanced');
    }
  }
  return tags;
}

function tagsToEffects(tags: string[]) {
  return tags
    .map(tag => {
      const entry = FBMAP[tag];
      return entry && typeof entry === 'object' ? { ...entry, reason: tag } : undefined;
    })
    .filter((entry): entry is FeedbackMapEntry & { reason: string } => !!entry);
}

export function tagsToTips(tags: string[], lang: 'en' | 'zh' = 'en') {
  const out: string[] = [];
  for (const tag of tags) {
    const tips = TIPS[tag];
    if (!Array.isArray(tips) || tips.length === 0) continue;
    const [firstTip] = tips;
    if (!firstTip) continue;
    const primary = firstTip[lang] || firstTip.en;
    if (primary) out.push(primary);
  }
  return out;
}

export async function analyzeMeal(payload: AnalyzeInput, extractFn: ExtractFn) {
  const extracted = await extractFn(payload);
  const combinedNames = [
    ...(extracted.FOOD_ITEM ?? []),
    ...(extracted.DRINK_ITEM ?? []),
  ];

  const uniqueNames = Array.from(
    new Set(
      combinedNames
        .map(name => name?.trim())
        .filter((name): name is string => !!name)
    )
  );

  const sourceText = payload.text ?? '';
  const loweredText = sourceText.toLowerCase();

  const pairs = uniqueNames.reduce<Array<{ food: FoodEntry; item: CanonicalItem }>>(
    (acc, rawName) => {
      const food = findFoodFromDB(rawName);
      if (!food) return acc;
      const item = applyPortionAndModifiers(food, sourceText, loweredText);
      acc.push({ food, item });
      return acc;
    },
    []
  );

  const nutrients = computeAll(pairs);
  const tags = classify(nutrients.total);
  const avatar_effects = tagsToEffects(tags);
  const tips = tagsToTips(tags, 'en');

  return {
    canonical: pairs.map(({ food, item }) => ({
      ...item,
      display_name: item.name || prettyName(food.name, food.aliases),
    })),
    nutrients,
    tags,
    avatar_effects,
    tips,
  };
}

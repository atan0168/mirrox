import { searchFoods, getFoodById, FoodDetails } from './FoodService';
import { prettyName, titleize } from '../utils/displayName';
import type { ExtractedItem } from './DeepseekService';

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
  source?: string;
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
  source?: string | undefined;
  quantity?: number;
  portion_g?: number;
  volume_ml?: number;
  modifier_keys?: string[];
  portion_text?: string | null;
  modifiers?: string[];
};

export type AnalyzeInput = {
  text?: string;
  imageBase64?: string;
  selectedFoodIds?: string[];
  skipExtraction?: boolean;
};
type ExtractionResult = {
  FOOD_ITEM?: ExtractedItem[];
  DRINK_ITEM?: ExtractedItem[];
};

export type ExtractFn = (p: AnalyzeInput) => Promise<ExtractionResult>;

type NPart = Partial<Nutrients>;

const NUTRIENT_KEYS = [
  'energy_kcal',
  'carb_g',
  'sugar_g',
  'fat_g',
  'sat_fat_g',
  'protein_g',
  'fiber_g',
  'sodium_mg',
] as const;

type NutrientKey = (typeof NUTRIENT_KEYS)[number];

const mapNutrients = (mapper: (key: NutrientKey) => number): Nutrients => {
  const result = {} as Nutrients;
  for (const key of NUTRIENT_KEYS) {
    result[key] = mapper(key);
  }
  return result;
};

const zero = (): Nutrients => mapNutrients(() => 0);

const sum = (a: Nutrients, b: NPart): Nutrients =>
  mapNutrients(key => a[key] + (b[key] ?? 0));

const scale = (n: NPart, factor: number): Nutrients =>
  mapNutrients(key => (n[key] ?? 0) * factor);

const hasNutrientData = (data?: NPart | null): data is NPart =>
  !!data && Object.keys(data).length > 0;

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

const derivePortion = (
  food: FoodEntry,
  unitCategoryValue: number | undefined,
  sizeFactor: number,
  quantity: number
): Pick<CanonicalItem, 'portion_g' | 'volume_ml'> => {
  const scalePortion = (value: number) =>
    Math.round(value * sizeFactor) * quantity;

  if (hasNutrientData(food.nutrients_per_100g)) {
    if (unitCategoryValue != null) {
      return { portion_g: scalePortion(unitCategoryValue) };
    }
    const defaultGrams = food.default_portion?.grams;
    if (defaultGrams) {
      return { portion_g: scalePortion(defaultGrams) };
    }
    return { portion_g: Math.round(100 * quantity) };
  }

  if (hasNutrientData(food.nutrients_per_100ml)) {
    if (unitCategoryValue != null) {
      return { volume_ml: scalePortion(unitCategoryValue) };
    }
    const defaultMl = food.default_portion?.ml;
    if (defaultMl) {
      return { volume_ml: scalePortion(defaultMl) };
    }
    return { volume_ml: Math.round(250 * quantity) };
  }

  return {};
};

const getDisplayName = (food: FoodEntry, item: CanonicalItem): string =>
  item.name ?? prettyName(food.name, food.aliases);

const applySugarModifiers = (
  base: Nutrients,
  food: FoodEntry,
  modifierKeys?: string[]
): Nutrients => {
  if (!modifierKeys || modifierKeys.length === 0) {
    return base;
  }

  let adjustedSugar = base.sugar_g;
  for (const key of modifierKeys) {
    const sugarFactor = getSugarFactor(food.modifiers, key);
    if (sugarFactor != null) {
      adjustedSugar *= sugarFactor;
    }
  }

  if (adjustedSugar === base.sugar_g) {
    return base;
  }

  return { ...base, sugar_g: adjustedSugar };
};

const toFoodEntry = (details?: FoodDetails | null): FoodEntry | undefined =>
  details ? foodDetailsToEntry(details) : undefined;

function foodDetailsToEntry(full: FoodDetails): FoodEntry {
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

  if (full.source) {
    entry.source = full.source;
  }

  return entry;
}

function findFoodFromDB(raw: string): FoodEntry | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const hit = searchFoods(trimmed.toLowerCase(), 1)[0];
  return hit ? toFoodEntry(getFoodById(hit.id)) : undefined;
}

function getFoodEntryById(id: string): FoodEntry | undefined {
  return toFoodEntry(getFoodById(id));
}

function createCanonicalItem(
  food: FoodEntry,
  extracted?: ExtractedItem
): CanonicalItem {
  const basePortion = derivePortion(food, undefined, 1, 1);
  const item: CanonicalItem = {
    id: food.id,
    name: titleize(food.name),
    source: food.source,
    quantity: 1,
    ...basePortion,
  };

  if (extracted) {
    const portionText =
      typeof extracted.portion === 'string' && extracted.portion.trim().length
        ? extracted.portion.trim()
        : null;
    item.portion_text = portionText ?? null;

    if (Array.isArray(extracted.modifiers) && extracted.modifiers.length) {
      const normalized = extracted.modifiers
        .map(modifier => modifier.trim())
        .filter(Boolean);
      if (normalized.length) {
        item.modifiers = Array.from(new Set(normalized));
      }
    } else {
      item.modifiers = [];
    }
  } else {
    item.portion_text = null;
    item.modifiers = [];
  }

  return item;
}

function computeItemNutrients(food: FoodEntry, item: CanonicalItem): Nutrients {
  let nutrients = zero();

  if (food.nutrients_per_100g && item.portion_g) {
    nutrients = sum(
      nutrients,
      scale(food.nutrients_per_100g, item.portion_g / 100)
    );
  }

  if (food.nutrients_per_100ml && item.volume_ml) {
    nutrients = sum(
      nutrients,
      scale(food.nutrients_per_100ml, item.volume_ml / 100)
    );
  }

  nutrients = applySugarModifiers(nutrients, food, item.modifier_keys);

  if (!nutrients.energy_kcal) {
    nutrients.energy_kcal =
      nutrients.carb_g * 4 + nutrients.protein_g * 4 + nutrients.fat_g * 9;
  }
  return nutrients;
}

function computeAll(pairs: Array<{ food: FoodEntry; item: CanonicalItem }>) {
  const per_item = pairs.map(({ food, item }) => {
    const nutrients = computeItemNutrients(food, item);
    const displayName = getDisplayName(food, item);
    const portionText = item.portion_text ?? null;
    const modifiers = item.modifiers ?? [];
    return {
      ...nutrients,
      id: item.id,
      name: displayName,
      display_name: displayName,
      source: food.source,
      portion_text: portionText,
      modifiers,
    };
  });
  const total = per_item.reduce<Nutrients>((acc, n) => sum(acc, n), zero());
  return { per_item, total };
}

export async function analyzeMeal(payload: AnalyzeInput, extractFn: ExtractFn) {
  const pairById = new Map<string, { food: FoodEntry; item: CanonicalItem }>();

  const upsertFoodEntry = (entry?: FoodEntry, extracted?: ExtractedItem) => {
    if (!entry) return;

    const existing = pairById.get(entry.id);
    if (existing) {
      if (extracted) {
        if (
          (!existing.item.portion_text ||
            existing.item.portion_text === null) &&
          typeof extracted.portion === 'string' &&
          extracted.portion.trim().length
        ) {
          existing.item.portion_text = extracted.portion.trim();
        }

        if (Array.isArray(extracted.modifiers) && extracted.modifiers.length) {
          const normalized = extracted.modifiers
            .map(modifier => modifier.trim())
            .filter(Boolean);
          if (normalized.length) {
            const merged = new Set([
              ...(existing.item.modifiers ?? []),
              ...normalized,
            ]);
            existing.item.modifiers = Array.from(merged);
          }
        }
      }
      return;
    }

    const item = createCanonicalItem(entry, extracted);
    pairById.set(entry.id, { food: entry, item });
  };

  const selectedIds = payload.selectedFoodIds ?? [];
  if (selectedIds.length > 0) {
    for (const id of selectedIds) {
      upsertFoodEntry(getFoodEntryById(id));
    }
  }

  const skipExtraction = payload.skipExtraction === true && pairById.size > 0;

  if (!skipExtraction) {
    const extracted = await extractFn(payload);
    const combinedItems = [
      ...(extracted?.FOOD_ITEM ?? []),
      ...(extracted?.DRINK_ITEM ?? []),
    ];

    for (const item of combinedItems) {
      if (!item?.name) continue;
      const entry = findFoodFromDB(item.name);
      upsertFoodEntry(entry, item);
    }
  }

  const pairs = Array.from(pairById.values());
  const nutrients = computeAll(pairs);

  return {
    canonical: pairs.map(({ food, item }) => ({
      ...item,
      display_name: getDisplayName(food, item),
    })),
    nutrients,
  };
}

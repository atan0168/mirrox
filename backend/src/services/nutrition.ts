// backend/src/services/nutrition.ts
import fs from "fs";
import path from "path";

// Use DB helpers instead of local JSON
import { searchFoods, getFoodById } from "../routes/foods_db";
// ⬇️ NEW: pretty display name helper
import { prettyName } from "../services/display_name";

/** ---------- Types ---------- */
export type Nutrients = {
  energy_kcal: number; carb_g: number; sugar_g: number; fat_g: number; sat_fat_g: number;
  protein_g: number; fiber_g: number; sodium_mg: number;
};

export type FoodEntry = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string;
  default_portion?: { unit:"piece"|"bowl"|"cup"|"plate"|"slice"|"g"|"ml"; grams?:number; ml?:number };
  nutrients_per_100g?: Partial<Nutrients> | null;
  nutrients_per_100ml?: Partial<Nutrients> | null;
  modifiers?: Record<string, Partial<{ sugar_factor:number; volume_factor:number; grams_factor:number }>> | null;
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
export type ExtractFn = (p: AnalyzeInput) => Promise<{ FOOD_ITEM: string[]; DRINK_ITEM: string[] }>;

/** ---------- Load configs (relative to backend root) ---------- */
const ROOT = process.cwd();
const j = (...p: string[]) => path.join(ROOT, ...p);
const readJSON = (p: string) => JSON.parse(fs.readFileSync(p, "utf-8"));

const UNIT  = readJSON(j("config/portion.units.json"));
const TH    = readJSON(j("config/nutrition.thresholds.json"));
const TIPS  = readJSON(j("config/feedback.tips.json"));
const FBMAP = readJSON(j("config/feedback.map.json"));

/** ---------- Helpers ---------- */
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Lookup food entry from SQLite database
 * - First perform fuzzy search with searchFoods
 * - Then fetch full details with getFoodById
 */
function findFoodFromDB(raw: string): FoodEntry | undefined {
  const q = norm(raw);
  const hit = searchFoods(q, 1)[0];
  if (!hit) return undefined;

  const full = getFoodById(hit.id);
  if (!full) return undefined;

  return {
    id: full.id,
    name: full.name,
    aliases: full.aliases || [],
    category: full.category,
    default_portion: full.default_portion || undefined,
    nutrients_per_100g: full.nutrients_per_100g || null,
    nutrients_per_100ml: full.nutrients_per_100ml || null,
    modifiers: full.modifiers || null,
  };
}

/** ---------- Portion & modifiers ---------- */
const SIZE = UNIT.small_medium_large_factors || { small: 0.8, medium: 1.0, large: 1.2 };
const QTY_RE = /(\d+)\s*(x|个|只|份|pieces?|pcs?)?/i;
const UWORDS = [
  { unit: "bowl",  re: /\b(bowl|碗|mangkuk)\b/i },
  { unit: "cup",   re: /\b(cup|杯)\b/i },
  { unit: "plate", re: /\b(plate|盘|碟)\b/i },
  { unit: "slice", re: /\b(slice|片)\b/i },
  { unit: "piece", re: /\b(piece|个|只|份)\b/i },
];
const SWORDS = [
  { size: "large", re: /\b(large|大杯|大份)\b/i },
  { size: "small", re: /\b(small|小杯|小份)\b/i },
];

/**
 * Determine portion size and modifiers from user text
 * - Quantity (e.g., "2x", "两个")
 * - Size (small/large)
 * - Container (bowl, cup, plate, slice, piece)
 * - Sugar modifiers (less sugar / no sugar / kurang manis)
 */
function applyPortionAndModifiers(food: FoodEntry, text: string): CanonicalItem {
  const t = (text || "").toLowerCase();
  const quantity = Number(QTY_RE.exec(t)?.[1] || 1);
  const size = (SWORDS.find((x) => x.re.test(t))?.size as "small" | "large") || "medium";
  const sizeFactor = SIZE[size] || 1.0;
  const hit = (UWORDS.find((x) => x.re.test(t))?.unit as
    | "bowl"
    | "cup"
    | "plate"
    | "slice"
    | "piece"
    | undefined);

  const mods: string[] = [];
  if (t.includes("kurang manis")) mods.push("kurang manis");
  if (t.includes("less sugar")) mods.push("less sugar");
  if (t.includes("no sugar")) mods.push("no sugar");

  let portion_g: number | undefined;
  let volume_ml: number | undefined;

  if (food.nutrients_per_100g && Object.keys(food.nutrients_per_100g).length > 0) {
    // If per 100g data available → compute grams
    if (hit && UNIT[hit] && food.category && UNIT[hit][food.category]) {
      portion_g = Math.round(UNIT[hit][food.category] * sizeFactor) * quantity;
    } else if (food.default_portion?.grams) {
      portion_g = Math.round(food.default_portion.grams * sizeFactor) * quantity;
    } else {
      portion_g = 100 * quantity; // fallback: 100g
    }
  } else if (food.nutrients_per_100ml && Object.keys(food.nutrients_per_100ml).length > 0) {
    // If only per 100ml data available → compute milliliters
    if (hit && UNIT[hit] && food.category && UNIT[hit][food.category]) {
      volume_ml = Math.round(UNIT[hit][food.category] * sizeFactor) * quantity;
    } else if (food.default_portion?.ml) {
      volume_ml = Math.round(food.default_portion.ml * sizeFactor) * quantity;
    } else {
      volume_ml = 250 * quantity; // fallback: 250ml
    }
  }

  return {
    id: food.id,
    name: food.name,
    quantity,
    portion_g,
    volume_ml,
    modifier_keys: mods,
    confidence: 0.9,
  };
}

/** ---------- Math helpers ---------- */
type NPart = Partial<Nutrients>;
const zero = (): Nutrients => ({
  energy_kcal: 0, carb_g: 0, sugar_g: 0, fat_g: 0, sat_fat_g: 0,
  protein_g: 0, fiber_g: 0, sodium_mg: 0,
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

/** Compute nutrients for a single food item */
function computeItemNutrients(food: FoodEntry, item: CanonicalItem): Nutrients {
  let r = zero();

  if (food.nutrients_per_100g && item.portion_g) {
    r = sum(r, scale(food.nutrients_per_100g, item.portion_g / 100));
  }

  if (food.nutrients_per_100ml && item.volume_ml) {
    r = sum(r, scale(food.nutrients_per_100ml, item.volume_ml / 100));
  }

  for (const mk of item.modifier_keys || []) {
    const m = food.modifiers?.[mk];
    if (m?.sugar_factor != null) r.sugar_g *= m.sugar_factor;
  }

  // If energy not provided, derive from macros
  if (!r.energy_kcal) r.energy_kcal = r.carb_g * 4 + r.protein_g * 4 + r.fat_g * 9;
  return r;
}

/** Compute totals across all recognized food items */
function computeAll(pairs: Array<{ food: FoodEntry; item: CanonicalItem }>) {
  const per_item = pairs.map(({ food, item }) => {
    const n = computeItemNutrients(food, item);
    const dn = prettyName(food.name, food.aliases); // ← pretty display name
    return {
      ...n,
      id: item.id,
      name: item.name || dn,
      display_name: dn, // ← NEW
    };
  });
  const total = per_item.reduce<Nutrients>((acc, n) => sum(acc, n), zero());
  return { per_item, total };
}

/** ---------- Classification & feedback ---------- */
function classify(total: Nutrients): string[] {
  const tags: string[] = [];
  if (total.sugar_g >= TH.high_sugar_g) tags.push("high_sugar");
  if (total.fat_g >= TH.high_fat_g || total.sat_fat_g >= TH.high_sat_fat_g) tags.push("high_fat");
  if (total.fiber_g < TH.low_fiber_g) tags.push("low_fiber");
  if (total.sodium_mg >= TH.high_sodium_mg) tags.push("high_sodium");

  const kcal = total.energy_kcal || (total.carb_g * 4 + total.protein_g * 4 + total.fat_g * 9);
  if (kcal > 0) {
    const c = (total.carb_g * 4) / kcal * 100;
    const f = (total.fat_g * 9) / kcal * 100;
    const p = (total.protein_g * 4) / kcal * 100;
    const inR = (r: [number, number], v: number) => v >= r[0] && v <= r[1];
    if (!(inR(TH.balance_ranges.carb_pct, c) && inR(TH.balance_ranges.fat_pct, f) && inR(TH.balance_ranges.protein_pct, p))) {
      tags.push("unbalanced");
    }
  }
  return tags;
}

/** Map tags to avatar effects */
function tagsToEffects(tags: string[]) {
  return tags.filter((t) => FBMAP[t]).map((t: string) => ({ ...FBMAP[t], reason: t }));
}

/** Map tags to localized tips */
export function tagsToTips(tags: string[], lang: "en" | "zh" = "en") {
  const out: string[] = [];
  for (const t of tags) {
    const a = TIPS[t];
    if (a?.length) out.push(a[0][lang] || a[0].en);
  }
  return out;
}

/** ---------- Public: analyze ---------- */
export async function analyzeMeal(payload: AnalyzeInput, extractFn: ExtractFn) {
  const ex = await extractFn(payload);
  const names = [...(ex.FOOD_ITEM || []), ...(ex.DRINK_ITEM || [])];

  const pairs: Array<{ food: FoodEntry; item: CanonicalItem }> = [];

  for (const raw of names) {
    const food = findFoodFromDB(raw);
    if (!food) continue;

    const item = applyPortionAndModifiers(food, payload.text || "");
    // ensure item carries a nice-looking name for UI
    item.name = item.name || prettyName(food.name, food.aliases);
    pairs.push({ food, item });
  }

  const nutrients = computeAll(pairs);
  const tags = classify(nutrients.total);
  const avatar_effects = tagsToEffects(tags);
  const tips = tagsToTips(tags, "en");

  return {
    canonical: pairs.map(p => ({
      ...p.item,
      display_name: p.item.name || prettyName(p.food.name, p.food.aliases), // ← NEW
    })),
    nutrients,
    tags,
    avatar_effects,
    tips
  };
}

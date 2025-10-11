import db from '../models/db';

function buildFtsQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(token => `${token}*`)
    .join(' ');
}

export type FoodSummary = {
  id: string;
  name: string;
  category: string | null;
  quantity: string | null;
  source: string | null;
};

export type FoodDetails = {
  id: string;
  source?: string;
  name: string;
  category?: string;
  aliases: string[];
  default_portion: {
    unit: string;
    grams?: number;
    ml?: number;
  } | null;
  nutrients_per_100g: Record<string, number> | null;
  nutrients_per_100ml: Record<string, number> | null;
  modifiers: Record<string, unknown> | null;
};

type FoodRow = {
  id: string;
  source: string | null;
  name: string;
  category: string | null;
  short_name: string | null;
  quantity: string | null;
  brands: string | null;
  food_groups: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  carb_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  aliases_concat: string | null;
};

type NutrientKey =
  | 'energy_kcal'
  | 'carb_g'
  | 'sugar_g'
  | 'fat_g'
  | 'sat_fat_g'
  | 'protein_g'
  | 'fiber_g'
  | 'sodium_mg';

const NUTRIENT_KEYS: NutrientKey[] = [
  'energy_kcal',
  'carb_g',
  'sugar_g',
  'fat_g',
  'sat_fat_g',
  'protein_g',
  'fiber_g',
  'sodium_mg',
];

const BEVERAGE_KEYWORDS = [
  'beverage',
  'drink',
  'juice',
  'tea',
  'coffee',
  'milk',
  'milkshake',
  'soda',
  'soft drink',
  'cocoa',
  'water',
];

const SUGAR_MODIFIERS: Record<string, { sugar_factor: number }> = {
  'kurang manis': { sugar_factor: 0.7 },
  'less sugar': { sugar_factor: 0.7 },
  'no sugar': { sugar_factor: 0.1 },
};

function extractAliases(
  aliasesConcat: string | null,
  shortName: string | null
): string[] {
  const tokens = new Set<string>();

  if (aliasesConcat) {
    for (const alias of aliasesConcat.split('|:|')) {
      const trimmed = alias.trim();
      if (trimmed) tokens.add(trimmed);
    }
  }

  if (shortName) {
    const trimmed = shortName.trim();
    if (trimmed) tokens.add(trimmed);
  }

  return Array.from(tokens);
}

function buildNutrientRecord(row: FoodRow): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of NUTRIENT_KEYS) {
    const value = row[key];
    if (value == null) continue;
    const numericValue =
      typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (Number.isFinite(numericValue)) {
      out[key] = numericValue;
    }
  }
  return out;
}

function isBeverage(row: FoodRow): boolean {
  const haystack = `${row.category ?? ''} ${row.food_groups ?? ''}`
    .toLowerCase()
    .replace(/[_-]/g, ' ');
  return BEVERAGE_KEYWORDS.some(keyword => haystack.includes(keyword));
}

function buildModifiers(row: FoodRow): Record<string, unknown> | null {
  if (!isBeverage(row)) return null;
  const sugar = row.sugar_g ?? 0;
  if (!(sugar > 0)) return null;
  return { ...SUGAR_MODIFIERS };
}

/** Search the foods catalogue with FTS (fallbacks to LIKE on failure). */
export function searchFoods(q: string, limit = 20): FoodSummary[] {
  const ftsQuery = buildFtsQuery(q);

  try {
    const rows = db
      .prepare<unknown[], FoodSummary>(
        `SELECT f.id, f.name, f.category, f.quantity, f.source
         FROM foods_fts fts
         JOIN foods f ON f.rowid = fts.rowid
        WHERE foods_fts MATCH ?
        ORDER BY bm25(foods_fts) ASC
        LIMIT ?`
      )
      .all(ftsQuery, limit);

    if (rows.length > 0) {
      return rows;
    }
  } catch (error) {
    console.error(
      '[FoodService] FTS search failed, falling back to LIKE:',
      error
    );
  }

  const like = `%${q.toLowerCase()}%`;

  return db
    .prepare<unknown[], FoodSummary>(
      `SELECT DISTINCT f.id, f.name, f.category, f.quantity, f.source
       FROM foods f
       LEFT JOIN alias a ON a.food_id = f.id
      WHERE lower(f.name) LIKE ?
         OR lower(ifnull(f.short_name, '')) LIKE ?
         OR lower(ifnull(a.alias, '')) LIKE ?
      ORDER BY f.name
      LIMIT ?`
    )
    .all(like, like, like, limit);
}

/** Get food details by id (parses JSON columns). */
export function getFoodById(id: string): FoodDetails | null {
  const row = db
    .prepare<unknown[], FoodRow>(
      `SELECT f.*,
              GROUP_CONCAT(a.alias, '|:|') AS aliases_concat
         FROM foods f
         LEFT JOIN alias a ON a.food_id = f.id
        WHERE f.id = ?
     GROUP BY f.id`
    )
    .get(id);

  if (!row) return null;

  const aliases = extractAliases(row.aliases_concat, row.short_name);
  const nutrients = buildNutrientRecord(row);
  const beverage = isBeverage(row);
  const hasNutrients = Object.keys(nutrients).length > 0;
  const nutrientsPer100g = hasNutrients && !beverage ? nutrients : null;
  const nutrientsPer100ml = hasNutrients && beverage ? nutrients : null;

  const details: FoodDetails = {
    id: row.id,
    name: row.name,
    aliases,
    default_portion: null,
    nutrients_per_100g: nutrientsPer100g,
    nutrients_per_100ml: nutrientsPer100ml,
    modifiers: buildModifiers(row),
  };

  if (row.source) {
    details.source = row.source;
  }

  if (row.category) {
    details.category = row.category;
  }

  return details;
}

/** Simple paginated food list. */
export function listFoods(
  offset = 0,
  limit = 50
): Array<Pick<FoodSummary, 'id' | 'name' | 'category'>> {
  return db
    .prepare<unknown[], FoodSummary>(
      `SELECT id, name, category
       FROM foods
       ORDER BY name
       LIMIT ?
       OFFSET ?`
    )
    .all(limit, offset);
}

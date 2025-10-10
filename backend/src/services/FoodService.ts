import db from '../models/db';

export type FoodRow = {
  id: string;
  source: string | null;
  name: string;
  category: string | null;
  aliases_json: string | null;
  default_portion_json: string | null;
  nutrients_per_100g_json: string | null;
  nutrients_per_100ml_json: string | null;
  modifiers_json: string | null;
};

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

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

/** Search the foods catalogue with FTS (fallbacks to LIKE on failure). */
export function searchFoods(q: string, limit = 20): FoodSummary[] {
  const ftsQuery = buildFtsQuery(q);

  try {
    const rows = db
      .prepare<unknown[], FoodSummary>(
        `SELECT f.id, f.name, f.category
         FROM foods_fts fts
         JOIN foods f ON f.rowid = fts.rowid
        WHERE foods_fts MATCH ?
        ORDER BY bm25(fts) ASC
        LIMIT ?`
      )
      .all(ftsQuery, limit);

    if (rows.length > 0) {
      return rows;
    }
  } catch (error) {
    console.error('[FoodService] FTS search failed, falling back to LIKE:', error);
  }

  const like = `%${q.toLowerCase()}%`;

  return db
    .prepare<unknown[], FoodSummary>(
      `SELECT id, name, category
       FROM foods
      WHERE lower(name) LIKE ?
         OR lower(ifnull(aliases_json, '')) LIKE ?
      ORDER BY name
      LIMIT ?`
    )
    .all(like, like, limit);
}

/** Get food details by id (parses JSON columns). */
export function getFoodById(id: string): FoodDetails | null {
  const row = db
    .prepare<unknown[], FoodRow>(`SELECT * FROM foods WHERE id = ?`)
    .get(id);

  if (!row) return null;

  const details: FoodDetails = {
    id: row.id,
    name: row.name,
    aliases: parseJson<string[]>(row.aliases_json) ?? [],
    default_portion:
      parseJson<{ unit: string; grams?: number; ml?: number }>(
        row.default_portion_json
      ) ?? null,
    nutrients_per_100g:
      parseJson<Record<string, number>>(row.nutrients_per_100g_json) ?? null,
    nutrients_per_100ml:
      parseJson<Record<string, number>>(row.nutrients_per_100ml_json) ?? null,
    modifiers: parseJson<Record<string, unknown>>(row.modifiers_json) ?? null,
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

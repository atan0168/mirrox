// backend/src/routes/foods_db.ts
// Purpose: data access helpers for nutrition.db with NAMED exports.

import db from '../models/db'; // ← change this path if your db connection lives elsewhere

// Row shape in the SQLite 'foods' table
type FoodRow = {
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

// Safe JSON parser
function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * Build FTS query string: lowercase, clean, split words, add * for prefix search
 */
function buildFtsQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(t => `${t}*`)
    .join(' ');
}

/**
 * Search foods using FTS (foods_fts) if available; fallback to LIKE.
 * Named export.
 */
export function searchFoods(q: string, limit = 20) {
  const ftsQuery = buildFtsQuery(q);

  // --- 1. Try FTS5 virtual table first ---
  try {
    const rows = db
      .prepare(
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
  } catch (e) {
    console.error('FTS search failed:', e);
  }

  // --- 2. Fallback: basic LIKE on name and aliases_json ---
  const like = `%${q.toLowerCase()}%`;
  return db
    .prepare(
      `SELECT id, name, category
       FROM foods
      WHERE lower(name) LIKE ?
         OR lower(ifnull(aliases_json,'')) LIKE ?
      LIMIT ?`
    )
    .all(like, like, limit);
}

/**
 * Get one food by id; expand JSON columns.
 * Named export.
 */
export function getFoodById(id: string) {
  const row = db
    .prepare<unknown[], FoodRow>(`SELECT * FROM foods WHERE id = ?`)
    .get(id);

  if (!row) return null;

  return {
    id: row.id,
    source: row.source ?? undefined,
    name: row.name,
    category: row.category ?? undefined,
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
}

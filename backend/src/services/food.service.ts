import db from "../models/db";

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

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** Search by FTS on name + aliases */
export function searchFoods(q: string, limit = 20) {
  return db.prepare(
    `SELECT f.id, f.name, f.category
       FROM foods_fts fts
       JOIN foods f ON f.rowid = fts.rowid
      WHERE foods_fts MATCH ?
      LIMIT ?`
  ).all(q, limit);
}

/** Get food details by id */
export function getFoodById(id: string) {
  const row = db.prepare<unknown[], FoodRow>(
    `SELECT * FROM foods WHERE id = ?`
  ).get(id);
  if (!row) return null;

  return {
    id: row.id,
    source: row.source,
    name: row.name,
    category: row.category,
    aliases: parseJson<string[]>(row.aliases_json) || [],
    default_portion: parseJson<any>(row.default_portion_json),
    nutrients_per_100g: parseJson<any>(row.nutrients_per_100g_json),
    nutrients_per_100ml: parseJson<any>(row.nutrients_per_100ml_json),
    modifiers: parseJson<any>(row.modifiers_json),
  };
}

/** Simple food list (optional) */
export function listFoods(offset = 0, limit = 50) {
  return db.prepare(
    `SELECT id, name, category FROM foods ORDER BY name LIMIT ? OFFSET ?`
  ).all(limit, offset);
}

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// ---------- types ----------
type Food = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string | null;
  default_portion?: any | null;
  nutrients_per_100g?: any | null;
  nutrients_per_100ml?: any | null;
  modifiers?: any | null;
  // Keep source union for clarity
  source?: 'CURATED' | 'MyFCD';
  // Keep optional legacy fields (harmless if present)
  basis?: string | null;
  nutrients?: any | null;
};

// ---------- utils ----------
const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'nutrition.db');
const dataDir = path.join(root, 'data');
const pCurated = path.join(dataDir, 'foods.my.json'); // your curated Malaysia data
const pMyFcd = path.join(dataDir, 'myfcd_clean.json'); // your MyFCD Malaysia data

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function J(x: any) {
  return x == null ? null : JSON.stringify(x);
}
function keyName(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

// Normalize nutrients: convert NaN -> null, coerce number-like strings, drop undefined
function sanitizeNutrients(n: any) {
  if (!n) return null;
  const out: any = {};
  for (const k of [
    'energy_kcal',
    'carb_g',
    'sugar_g',
    'fat_g',
    'sat_fat_g',
    'protein_g',
    'fiber_g',
    'sodium_mg',
  ]) {
    const v = n[k];
    out[k] =
      typeof v === 'number' && Number.isFinite(v)
        ? v
        : v == null
          ? null
          : Number.isFinite(Number(v))
            ? Number(v)
            : null;
  }
  return out;
}

// ---------- load two sources (CURATED + MyFCD only) ----------
function loadCurated(): Food[] {
  if (!fs.existsSync(pCurated)) return [];
  const arr: Food[] = readJson(pCurated);
  return arr.map(x => ({
    ...x,
    source: 'CURATED',
    nutrients_per_100g: sanitizeNutrients(x.nutrients_per_100g),
    nutrients_per_100ml: sanitizeNutrients(x.nutrients_per_100ml),
  }));
}

function loadMyFcd(): Food[] {
  if (!fs.existsSync(pMyFcd)) return [];
  const arr: Food[] = readJson(pMyFcd);
  return arr.map(x => ({
    ...x,
    // Avoid id collision: ensure MyFCD ids are prefixed
    id: x.id?.startsWith('myfcd-') ? x.id : `myfcd-${x.id}`,
    source: 'MyFCD',
    nutrients_per_100g: sanitizeNutrients(x.nutrients_per_100g),
    nutrients_per_100ml: sanitizeNutrients(x.nutrients_per_100ml),
  }));
}

// ---------- merge with priority: CURATED > MyFCD ----------
function mergeAll(curated: Food[], myfcd: Food[]) {
  // Key by normalized name, so "Nasi Lemak" and "nasi-lemak" collapse
  const best = new Map<string, Food>();

  const apply = (list: Food[]) => {
    for (const r of list) {
      const k = keyName(r.name);
      const prev = best.get(k);
      if (!prev) {
        best.set(k, r);
      } else {
        // Lower priority entries only fill missing fields on the existing record
        const merged: Food = { ...prev };
        // merge aliases
        const a = new Set([...(prev.aliases || []), ...(r.aliases || [])]);
        merged.aliases = Array.from(a);
        // fill missing category / default_portion
        if (!merged.category && r.category) merged.category = r.category;
        if (!merged.default_portion && r.default_portion)
          merged.default_portion = r.default_portion;
        // fill missing nutrient keys (per 100g and per 100ml)
        const n100g = merged.nutrients_per_100g || {};
        const n2 = r.nutrients_per_100g || {};
        const n100ml = merged.nutrients_per_100ml || {};
        const n2ml = r.nutrients_per_100ml || {};
        const KEYS = [
          'energy_kcal',
          'carb_g',
          'sugar_g',
          'fat_g',
          'sat_fat_g',
          'protein_g',
          'fiber_g',
          'sodium_mg',
        ] as const;
        for (const key of KEYS)
          if (n100g[key] == null && n2[key] != null) n100g[key] = n2[key];
        for (const key of KEYS)
          if (n100ml[key] == null && n2ml[key] != null) n100ml[key] = n2ml[key];
        merged.nutrients_per_100g = Object.keys(n100g).length ? n100g : null;
        merged.nutrients_per_100ml = Object.keys(n100ml).length ? n100ml : null;
        // fill modifiers if missing
        if (!merged.modifiers && r.modifiers) merged.modifiers = r.modifiers;

        best.set(k, merged);
      }
    }
  };

  apply(curated); // highest priority
  apply(myfcd); // fill gaps

  return Array.from(best.values());
}

// ---------- main ----------
(function main() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Ensure schema exists and is applied
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Optional: clear existing tables before seeding
  db.exec(`DELETE FROM foods; DELETE FROM foods_fts;`);

  const curated = loadCurated();
  const myfcd = loadMyFcd();
  const merged = mergeAll(curated, myfcd);

  const ins = db.prepare(`
    INSERT OR REPLACE INTO foods
    (id, source, name, category, aliases_json, default_portion_json, nutrients_per_100g_json, nutrients_per_100ml_json, modifiers_json)
    VALUES (@id, @source, @name, @category, @aliases_json, @default_portion_json, @n100g_json, @n100ml_json, @mods_json)
  `);
  const insFts = db.prepare(
    `INSERT INTO foods_fts (rowid, name, aliases) VALUES (?, ?, ?)`
  );

  const tx = db.transaction((rows: Food[]) => {
    for (const r of rows) {
      ins.run({
        id: r.id,
        source: r.source,
        name: r.name,
        category: r.category || null,
        aliases_json: J(r.aliases || []),
        default_portion_json: J(r.default_portion || null),
        n100g_json: J(r.nutrients_per_100g || null),
        n100ml_json: J(r.nutrients_per_100ml || null),
        mods_json: J(r.modifiers || null),
      });

      // safer rowid handling for FTS
      const got = db
        .prepare(`SELECT rowid AS rowid FROM foods WHERE id=?`)
        .get(r.id) as { rowid: number } | undefined;

      if (got && typeof got.rowid === 'number') {
        insFts.run(got.rowid, r.name, (r.aliases || []).join(' '));
      } else {
        console.warn(`⚠️ WARN: rowid not found for id=${r.id}`);
      }
    }
  });

  tx(merged);

  console.log(
    `✅ Seed done. CURATED: ${curated.length}, MyFCD: ${myfcd.length}, merged: ${merged.length}`
  );
})();

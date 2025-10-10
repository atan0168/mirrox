import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// ---------- types ----------
type Food = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string | null;
  default_portion?: unknown | null;
  nutrients_per_100g?: NutrientSet | null;
  nutrients_per_100ml?: NutrientSet | null;
  modifiers?: unknown | null;
  // Keep source union for clarity
  source?: 'CURATED' | 'MyFCD';
  // Keep optional legacy fields (harmless if present)
  basis?: string | null;
  nutrients?: unknown | null;
};

const nutrientFields = [
  'energy_kcal',
  'carb_g',
  'sugar_g',
  'fat_g',
  'sat_fat_g',
  'protein_g',
  'fiber_g',
  'sodium_mg',
] as const;

type NutrientKey = (typeof nutrientFields)[number];
type NutrientSet = Partial<Record<NutrientKey, number | null>>;

// ---------- utils ----------
const root = path.join(__dirname, '..');
const dataDir = path.join(__dirname, './data');
const dbPath = path.join(root, 'nutrition.db');
const pCurated = path.join(dataDir, 'foods.my.json'); // your curated Malaysia data
const pMyFcd = path.join(dataDir, 'myfcd_clean.json'); // your MyFCD Malaysia data

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function J(x: unknown) {
  return x == null ? null : JSON.stringify(x);
}
function keyName(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const coerceNumeric = (value: unknown) => {
  const candidate =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(candidate) ? Number(candidate) : null;
};

const sanitizeNutrients = (n: unknown): NutrientSet | null =>
  n
    ? (() => {
        const source = n as Record<NutrientKey, unknown>;
        const entries = nutrientFields
          .map(key => [key, coerceNumeric(source[key])] as const)
          .filter((entry): entry is [NutrientKey, number] => entry[1] != null);
        return entries.length
          ? (Object.fromEntries(entries) as NutrientSet)
          : null;
      })()
    : null;

// ---------- load two sources (CURATED + MyFCD only) ----------
function loadCurated(): Food[] {
  return fs.existsSync(pCurated)
    ? (readJson(pCurated) as Food[]).map(x => ({
        ...x,
        source: 'CURATED',
        nutrients_per_100g: sanitizeNutrients(x.nutrients_per_100g),
        nutrients_per_100ml: sanitizeNutrients(x.nutrients_per_100ml),
      }))
    : [];
}

function loadMyFcd(): Food[] {
  return fs.existsSync(pMyFcd)
    ? (readJson(pMyFcd) as Food[]).map(x => ({
        ...x,
        // Avoid id collision: ensure MyFCD ids are prefixed
        id: x.id?.startsWith('myfcd-') ? x.id : `myfcd-${x.id}`,
        source: 'MyFCD',
        nutrients_per_100g: sanitizeNutrients(x.nutrients_per_100g),
        nutrients_per_100ml: sanitizeNutrients(x.nutrients_per_100ml),
      }))
    : [];
}

const selectDefined = <T>(
  primary: T | null | undefined,
  fallback: T | null | undefined
) => primary ?? fallback ?? null;

const mergeNutrients = (
  primary: NutrientSet | null | undefined,
  fallback: NutrientSet | null | undefined
) => {
  const merged: NutrientSet = { ...(primary ?? {}) };
  nutrientFields.forEach(key => {
    merged[key] = merged[key] ?? fallback?.[key] ?? null;
  });
  return Object.values(merged).some(v => v != null) ? merged : null;
};

const mergeFoods = (primary: Food, candidate: Food): Food => {
  const aliasSet = new Set([
    ...(primary.aliases ?? []),
    ...(candidate.aliases ?? []),
  ]);
  return {
    ...primary,
    aliases: aliasSet.size ? Array.from(aliasSet) : undefined,
    category: selectDefined(primary.category, candidate.category),
    default_portion: selectDefined(
      primary.default_portion,
      candidate.default_portion
    ),
    nutrients_per_100g: mergeNutrients(
      primary.nutrients_per_100g,
      candidate.nutrients_per_100g
    ),
    nutrients_per_100ml: mergeNutrients(
      primary.nutrients_per_100ml,
      candidate.nutrients_per_100ml
    ),
    modifiers: selectDefined(primary.modifiers, candidate.modifiers),
  };
};

// ---------- merge with priority: CURATED > MyFCD ----------
function mergeAll(curated: Food[], myfcd: Food[]) {
  const best = new Map<string, Food>();

  const apply = (list: Food[]) =>
    list.forEach(record => {
      const key = keyName(record.name);
      const existing = best.get(key);
      best.set(key, existing ? mergeFoods(existing, record) : record);
    });

  apply(curated);
  apply(myfcd);

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
      const rowid = (
        db.prepare(`SELECT rowid AS rowid FROM foods WHERE id=?`).get(r.id) as
          | { rowid?: number }
          | undefined
      )?.rowid;

      typeof rowid === 'number'
        ? insFts.run(rowid, r.name, (r.aliases || []).join(' '))
        : console.warn(`⚠️ WARN: rowid not found for id=${r.id}`);
    }
  });

  tx(merged);

  console.log(
    `✅ Seed done. CURATED: ${curated.length}, MyFCD: ${myfcd.length}, merged: ${merged.length}`
  );
})();

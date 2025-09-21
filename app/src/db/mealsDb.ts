// app/src/db/mealsDb.ts
import * as SQLite from 'expo-sqlite';

export type MealRow = {
  id: number;
  started_at: number; // ms
  ended_at: number | null;
};

export type MealItemRow = {
  id: number;
  meal_id: number;
  name: string;
  qty: number;        // 可选：份量，默认 1
  energy_kcal: number | null;
  meta_json: string | null; // 保存来源、每项营养等
};

let db: SQLite.SQLiteDatabase | null = null;
export function getDb() {
  if (!db) db = SQLite.openDatabaseSync('meals.db');
  return db;
}

/** create tables if not exist */
export function ensureMealsSchema() {
  const d = getDb();
  d.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS meals(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS meal_items(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    energy_kcal REAL,
    meta_json TEXT,
    FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE
  );
  `);
}

/** start a meal and return id */
export function createMeal(): number {
  const d = getDb();
  const started = Date.now();
  d.runSync(`INSERT INTO meals(started_at, ended_at) VALUES(?, NULL)`, [started]);
  const id = d.getFirstSync<{ id: number }>(`SELECT last_insert_rowid() AS id`)!.id;
  return id;
}

/** end a meal */
export function closeMeal(mealId: number) {
  getDb().runSync(`UPDATE meals SET ended_at = ? WHERE id = ?`, [Date.now(), mealId]);
}

/** insert one item */
export function insertMealItem(mealId: number, name: string, energy?: number | null, qty = 1, meta?: any) {
  const d = getDb();
  d.runSync(
    `INSERT INTO meal_items(meal_id, name, qty, energy_kcal, meta_json) VALUES(?,?,?,?,?)`,
    [mealId, name, qty, energy ?? null, meta ? JSON.stringify(meta) : null]
  );
  const id = d.getFirstSync<{ id: number }>(`SELECT last_insert_rowid() AS id`)!.id;
  return id;
}

/** bulk insert */
export function insertMealItemsBulk(mealId: number, items: Array<{name:string; energy?:number|null; qty?:number; meta?:any;}>) {
  const d = getDb();
  d.execSync('BEGIN');
  try {
    for (const it of items) {
      d.runSync(
        `INSERT INTO meal_items(meal_id, name, qty, energy_kcal, meta_json) VALUES(?,?,?,?,?)`,
        [mealId, it.name, it.qty ?? 1, it.energy ?? null, it.meta ? JSON.stringify(it.meta) : null]
      );
    }
    d.execSync('COMMIT');
  } catch (e) {
    d.execSync('ROLLBACK');
    throw e;
  }
}

/** delete one item */
export function deleteMealItem(itemId: number) {
  getDb().runSync(`DELETE FROM meal_items WHERE id = ?`, [itemId]);
}

/** query current meal items */
export function listMealItems(mealId: number): MealItemRow[] {
  return getDb().getAllSync<MealItemRow>(`SELECT * FROM meal_items WHERE meal_id = ? ORDER BY id DESC`, [mealId]);
}

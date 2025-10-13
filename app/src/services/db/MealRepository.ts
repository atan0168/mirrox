import { getDatabase } from './sqlite';

export type MealRow = {
  id: number;
  started_at: number;
  ended_at: number | null;
  date: string;
};

export type MealItemRow = {
  id: number;
  meal_id: number;
  name: string;
  qty: number;
  energy_kcal: number | null;
  meta_json: string | null;
};

import { localDayKeyUtc } from '../../utils/datetimeUtils';
const getTodayDate = () => localDayKeyUtc(new Date());

export const MealsRepository = {
  async getMealByDate(date: string): Promise<MealRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<MealRow>(
      `SELECT id, started_at, ended_at, date FROM meals WHERE date = ? LIMIT 1`,
      [date]
    );
    return row ?? null;
  },

  async ensureMealForDate(date: string): Promise<number> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM meals WHERE date = ? LIMIT 1`,
      [date]
    );
    if (existing?.id != null) {
      return existing.id;
    }

    const startedAt = Date.now();
    await db.runAsync(
      `INSERT INTO meals(started_at, ended_at, date) VALUES(?, NULL, ?)`,
      [startedAt, date]
    );
    const inserted = await db.getFirstAsync<{ id: number }>(
      `SELECT last_insert_rowid() AS id`
    );
    if (!inserted?.id) {
      throw new Error('Failed to create meal record');
    }
    return inserted.id;
  },

  async closeMealsBeforeDate(date: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE meals
       SET ended_at = ?
       WHERE date < ?
         AND (ended_at IS NULL OR ended_at = 0)`,
      [Date.now(), date]
    );
  },

  async ensureMealForToday(): Promise<number> {
    const today = getTodayDate();
    await MealsRepository.closeMealsBeforeDate(today);
    return MealsRepository.ensureMealForDate(today);
  },

  async closeMeal(mealId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE meals SET ended_at = ? WHERE id = ?`, [
      Date.now(),
      mealId,
    ]);
  },

  async addMealItem(
    mealId: number,
    name: string,
    energy: number | null = null,
    qty = 1,
    meta?: unknown
  ): Promise<number> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO meal_items(meal_id, name, qty, energy_kcal, meta_json) VALUES(?,?,?,?,?)`,
      [mealId, name, qty, energy ?? null, meta ? JSON.stringify(meta) : null]
    );
    const inserted = await db.getFirstAsync<{ id: number }>(
      `SELECT last_insert_rowid() AS id`
    );
    if (!inserted?.id) {
      throw new Error('Failed to insert meal item');
    }
    return inserted.id;
  },

  async addMealItemsBulk(
    mealId: number,
    items: Array<{
      name: string;
      energy?: number | null;
      qty?: number;
      meta?: unknown;
    }>
  ): Promise<void> {
    if (!items.length) return;

    const db = await getDatabase();
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO meal_items(meal_id, name, qty, energy_kcal, meta_json) VALUES(?,?,?,?,?)`,
          [
            mealId,
            item.name,
            item.qty ?? 1,
            item.energy ?? null,
            item.meta ? JSON.stringify(item.meta) : null,
          ]
        );
      }
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  },

  async deleteMealItem(itemId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM meal_items WHERE id = ?`, [itemId]);
  },

  async listMealItems(mealId: number): Promise<MealItemRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<MealItemRow>(
      `SELECT id, meal_id, name, qty, energy_kcal, meta_json
       FROM meal_items
       WHERE meal_id = ?
       ORDER BY id DESC`,
      [mealId]
    );
  },

  async listMealsWithSummary(limit?: number): Promise<
    Array<
      MealRow & {
        total_energy_kcal: number;
        item_count: number;
      }
    >
  > {
    const db = await getDatabase();
    const query = `SELECT
        m.id,
        m.started_at,
        m.ended_at,
        m.date,
        COALESCE(SUM(mi.energy_kcal), 0) AS total_energy_kcal,
        COUNT(mi.id) AS item_count
      FROM meals m
      LEFT JOIN meal_items mi ON mi.meal_id = m.id
      GROUP BY m.id
      ORDER BY m.started_at DESC
      ${limit && Number.isFinite(limit) ? 'LIMIT ?' : ''}`;

    const rows = await db.getAllAsync<
      MealRow & { total_energy_kcal: number | null; item_count: number | null }
    >(query, limit && Number.isFinite(limit) ? [limit] : []);

    return rows.map(row => ({
      ...row,
      total_energy_kcal: row.total_energy_kcal ?? 0,
      item_count: row.item_count ?? 0,
    }));
  },
};

export const getMealForTodayId = async (): Promise<number | null> => {
  const existing = await MealsRepository.getMealByDate(getTodayDate());
  return existing?.id ?? null;
};

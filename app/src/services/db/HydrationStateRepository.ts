import { getDatabase } from './sqlite';

const TABLE_NAME = 'hydration_state';

export const HydrationStateRepository = {
  async get(key: string): Promise<string | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
        [key]
      );
      return row?.value ?? null;
    } catch (error) {
      console.error('[HydrationStateRepository] Failed to load state', error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      const db = await getDatabase();
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO ${TABLE_NAME} (key, value, updatedAt)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
        [key, value, now]
      );
    } catch (error) {
      console.error('[HydrationStateRepository] Failed to save state', error);
      throw error;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE key = ?`, [key]);
    } catch (error) {
      console.error('[HydrationStateRepository] Failed to remove state', error);
      throw error;
    }
  },
};

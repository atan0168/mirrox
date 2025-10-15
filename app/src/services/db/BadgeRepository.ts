import { getDatabase } from './sqlite';

export type BadgeRow = {
  id: string;
  awarded_at: number;
};

export const BadgeRepository = {
  async hasId(badgeId: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM badges WHERE id = ? LIMIT 1`,
      [badgeId]
    );
    return !!row;
  },

  async award(badgeId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO badges(id, awarded_at) VALUES(?, ?)`,
      [badgeId, Date.now()]
    );
  },

  async getAll(): Promise<BadgeRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<BadgeRow>(
      `SELECT id, awarded_at FROM badges ORDER BY awarded_at DESC`
    );
  },

  async getAllIds(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM badges`);
    return rows.map(r => r.id);
  },

  async getCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM badges`
    );
    return row?.count ?? 0;
  },
};

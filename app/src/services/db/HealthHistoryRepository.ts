import { getDatabase } from './sqlite';
import type { HealthHistory, HealthSnapshot } from '../../models/Health';

export const HealthHistoryRepository = {
  async upsert(snapshot: HealthSnapshot): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO health_snapshots (date, timestamp, platform, steps, sleepMinutes) VALUES (?, ?, ?, ?, ?)',
      [
        snapshot.date,
        snapshot.timestamp,
        snapshot.platform,
        snapshot.steps,
        snapshot.sleepMinutes,
      ]
    );
  },

  async getLatest(): Promise<HealthSnapshot | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<HealthSnapshot>(
      'SELECT date, timestamp, platform, steps, sleepMinutes FROM health_snapshots ORDER BY date DESC LIMIT 1'
    );
    return row ?? null;
  },

  async getByDate(date: string): Promise<HealthSnapshot | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<HealthSnapshot>(
      'SELECT date, timestamp, platform, steps, sleepMinutes FROM health_snapshots WHERE date = ?',
      [date]
    );
    return row ?? null;
  },

  async getHistory(limit = 30): Promise<HealthHistory> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HealthSnapshot>(
      'SELECT date, timestamp, platform, steps, sleepMinutes FROM health_snapshots ORDER BY date DESC LIMIT ?',
      [limit]
    );
    // Return ascending order like previous implementation
    const snapshots = rows.sort((a, b) => a.date.localeCompare(b.date));
    return { snapshots };
  },
};

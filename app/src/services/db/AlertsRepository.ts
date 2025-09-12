import { getDatabase } from './sqlite';
import type { AlertItem, AlertSeverity } from '../../models/Alert';

export const AlertsRepository = {
  async add(alert: AlertItem): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO alerts (
        id, type, createdAt, title, shortBody, longBody, sourceName, sourceUrl, tier, dataNote, severity, dismissed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alert.id,
        alert.type,
        alert.createdAt,
        alert.title,
        alert.shortBody,
        alert.longBody,
        alert.sourceName ?? null,
        alert.sourceUrl ?? null,
        alert.tier ?? null,
        alert.dataNote ?? null,
        alert.severity,
        alert.dismissed ? 1 : 0,
      ]
    );
  },

  async getAll(includeDismissed = false, limit = 200): Promise<AlertItem[]> {
    const db = await getDatabase();
    const where = includeDismissed ? '' : 'WHERE dismissed = 0';
    const rows = await db.getAllAsync<any>(
      `SELECT id, type, createdAt, title, shortBody, longBody, sourceName, sourceUrl, tier, dataNote, severity, dismissed
       FROM alerts ${where} ORDER BY datetime(createdAt) DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      title: r.title,
      shortBody: r.shortBody,
      longBody: r.longBody,
      sourceName: r.sourceName ?? undefined,
      sourceUrl: r.sourceUrl ?? undefined,
      tier: (r.tier ?? undefined) as 1 | 2 | 3 | undefined,
      dataNote: r.dataNote ?? undefined,
      severity: r.severity as AlertSeverity,
      dismissed: !!r.dismissed,
    }));
  },

  async getById(id: string): Promise<AlertItem | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(
      `SELECT id, type, createdAt, title, shortBody, longBody, sourceName, sourceUrl, tier, dataNote, severity, dismissed FROM alerts WHERE id = ?`,
      [id]
    );
    if (!r) return null;
    return {
      id: r.id,
      type: r.type,
      createdAt: r.createdAt,
      title: r.title,
      shortBody: r.shortBody,
      longBody: r.longBody,
      sourceName: r.sourceName ?? undefined,
      sourceUrl: r.sourceUrl ?? undefined,
      tier: (r.tier ?? undefined) as 1 | 2 | 3 | undefined,
      dataNote: r.dataNote ?? undefined,
      severity: r.severity as AlertSeverity,
      dismissed: !!r.dismissed,
    };
  },

  async dismiss(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE alerts SET dismissed = 1 WHERE id = ?`, [id]);
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM alerts`);
  },

  async purgeOlderThan(days: number): Promise<number> {
    const db = await getDatabase();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19);
    const res = await db.runAsync(
      `DELETE FROM alerts WHERE datetime(createdAt) < datetime(?)`,
      [cutoff]
    );
    // expo-sqlite returns undefined for changes in async interface; ignore
    return 0;
  },
};


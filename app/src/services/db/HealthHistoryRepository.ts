import { getDatabase } from './sqlite';
import type { HealthHistory, HealthSnapshot } from '../../models/Health';

export const HealthHistoryRepository = {
  async upsert(snapshot: HealthSnapshot): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO health_snapshots (
        date, timestamp, platform, steps, sleepMinutes, finalized,
        sleepStart, sleepEnd, timeInBedMinutes, awakeningsCount,
        sleepLightMinutes, sleepDeepMinutes, sleepRemMinutes,
        hrvMs, restingHeartRateBpm, activeEnergyKcal, mindfulMinutes,
        respiratoryRateBrpm, workoutsCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.date,
        snapshot.timestamp,
        snapshot.platform,
        snapshot.steps,
        snapshot.sleepMinutes,
        snapshot.finalized ? 1 : 0,
        snapshot.sleepStart ?? null,
        snapshot.sleepEnd ?? null,
        snapshot.timeInBedMinutes ?? null,
        snapshot.awakeningsCount ?? null,
        snapshot.sleepLightMinutes ?? null,
        snapshot.sleepDeepMinutes ?? null,
        snapshot.sleepRemMinutes ?? null,
        snapshot.hrvMs ?? null,
        snapshot.restingHeartRateBpm ?? null,
        snapshot.activeEnergyKcal ?? null,
        snapshot.mindfulMinutes ?? null,
        snapshot.respiratoryRateBrpm ?? null,
        snapshot.workoutsCount ?? null,
      ]
    );
  },

  async getLatest(): Promise<HealthSnapshot | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT date, timestamp, platform, steps, sleepMinutes, finalized, sleepStart, sleepEnd, timeInBedMinutes, awakeningsCount, sleepLightMinutes, sleepDeepMinutes, sleepRemMinutes, hrvMs, restingHeartRateBpm, activeEnergyKcal, mindfulMinutes, respiratoryRateBrpm, workoutsCount FROM health_snapshots ORDER BY date DESC LIMIT 1'
    );
    if (!row) return null;
    return {
      ...row,
      finalized: row.finalized ? true : false,
    } as HealthSnapshot;
  },

  async getByDate(date: string): Promise<HealthSnapshot | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT date, timestamp, platform, steps, sleepMinutes, finalized, sleepStart, sleepEnd, timeInBedMinutes, awakeningsCount, sleepLightMinutes, sleepDeepMinutes, sleepRemMinutes, hrvMs, restingHeartRateBpm, activeEnergyKcal, mindfulMinutes, respiratoryRateBrpm, workoutsCount FROM health_snapshots WHERE date = ?',
      [date]
    );
    return row
      ? ({ ...row, finalized: row.finalized ? true : false } as HealthSnapshot)
      : null;
  },

  async getHistory(limit = 30): Promise<HealthHistory> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT date, timestamp, platform, steps, sleepMinutes, finalized, sleepStart, sleepEnd, timeInBedMinutes, awakeningsCount, sleepLightMinutes, sleepDeepMinutes, sleepRemMinutes, hrvMs, restingHeartRateBpm, activeEnergyKcal, mindfulMinutes, respiratoryRateBrpm, workoutsCount FROM health_snapshots ORDER BY date DESC LIMIT ?',
      [limit]
    );
    // Map finalized to boolean and return ascending order like previous implementation
    const snapshots = rows
      .map(
        r => ({ ...r, finalized: r.finalized ? true : false }) as HealthSnapshot
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    return { snapshots };
  },
};

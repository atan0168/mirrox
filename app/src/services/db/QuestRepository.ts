import { getDatabase } from './sqlite';

export type QuestProgressRow = {
  id: number;
  quest_id: string;
  date: string;
  value: number;
  done: number;
  updated_at: number;
};

export type QuestStreakRow = {
  quest_id: string;
  count: number;
  last_date: string;
};

export type QuestHistoryRow = {
  id: number;
  quest_id: string;
  date: string;
  timestamp: number;
  title?: string;
  reward_points?: number;
  reward_tag?: string;
  note?: string;
  streak_count?: number;
};

export type QuestPointsRow = {
  tag: string;
  points: number;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const QuestRepository = {
  async getProgress(
    questId: string,
    date: string
  ): Promise<QuestProgressRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<QuestProgressRow>(
      `SELECT id, quest_id, date, value, done, updated_at 
       FROM quest_progress 
       WHERE quest_id = ? AND date = ? LIMIT 1`,
      [questId, date]
    );
    return row ?? null;
  },

  async getTodayProgress(questId: string): Promise<QuestProgressRow | null> {
    return this.getProgress(questId, getTodayDate());
  },

  async upsertProgress(
    questId: string,
    date: string,
    value: number,
    done: boolean
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_progress(quest_id, date, value, done, updated_at) 
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(quest_id, date) 
       DO UPDATE SET value = excluded.value, done = excluded.done, updated_at = excluded.updated_at`,
      [questId, date, value, done ? 1 : 0, Date.now()]
    );
  },

  async getStreak(questId: string): Promise<QuestStreakRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<QuestStreakRow>(
      `SELECT quest_id, count, last_date 
       FROM quest_streaks 
       WHERE quest_id = ? LIMIT 1`,
      [questId]
    );
    return row ?? null;
  },

  async getAllStreaks(): Promise<QuestStreakRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestStreakRow>(
      `SELECT quest_id, count, last_date FROM quest_streaks`
    );
  },

  async upsertStreak(
    questId: string,
    count: number,
    lastDate: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_streaks(quest_id, count, last_date) 
       VALUES(?, ?, ?)
       ON CONFLICT(quest_id) 
       DO UPDATE SET count = excluded.count, last_date = excluded.last_date`,
      [questId, count, lastDate]
    );
  },

  async addHistory(entry: {
    questId: string;
    date: string;
    timestamp: number;
    title?: string;
    rewardPoints?: number;
    rewardTag?: string;
    note?: string;
    streakCount?: number;
  }): Promise<number> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_history(quest_id, date, timestamp, title, reward_points, reward_tag, note, streak_count) 
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.questId,
        entry.date,
        entry.timestamp,
        entry.title ?? null,
        entry.rewardPoints ?? null,
        entry.rewardTag ?? null,
        entry.note ?? null,
        entry.streakCount ?? null,
      ]
    );
    const inserted = await db.getFirstAsync<{ id: number }>(
      `SELECT last_insert_rowid() AS id`
    );
    if (!inserted?.id) {
      throw new Error('Failed to insert quest history');
    }
    return inserted.id;
  },

  async getHistory(limit = 50): Promise<QuestHistoryRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestHistoryRow>(
      `SELECT id, quest_id, date, timestamp, title, reward_points, reward_tag, note, streak_count
       FROM quest_history
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );
  },

  async getHistoryByQuest(
    questId: string,
    limit = 50
  ): Promise<QuestHistoryRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestHistoryRow>(
      `SELECT id, quest_id, date, timestamp, title, reward_points, reward_tag, note, streak_count
       FROM quest_history
       WHERE quest_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [questId, limit]
    );
  },

  async getPoints(tag: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ points: number }>(
      `SELECT points FROM quest_points WHERE tag = ? LIMIT 1`,
      [tag]
    );
    return row?.points ?? 0;
  },

  async getAllPoints(): Promise<QuestPointsRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestPointsRow>(
      `SELECT tag, points FROM quest_points`
    );
  },

  async addPoints(tag: string, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_points(tag, points) 
       VALUES(?, ?)
       ON CONFLICT(tag) 
       DO UPDATE SET points = points + excluded.points`,
      [tag, amount]
    );
  },

  async getAllProgressForDate(date: string): Promise<QuestProgressRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestProgressRow>(
      `SELECT id, quest_id, date, value, done, updated_at 
       FROM quest_progress 
       WHERE date = ?`,
      [date]
    );
  },

  async getAllProgressForToday(): Promise<QuestProgressRow[]> {
    return this.getAllProgressForDate(getTodayDate());
  },
};

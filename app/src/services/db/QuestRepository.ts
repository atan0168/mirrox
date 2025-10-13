import { getDatabase } from './sqlite';
import {
  localDayKeyUtc,
  yesterdayLocalDayKeyUtc,
} from '../../utils/datetimeUtils';
import type { QuestId, RewardTag } from '../../models/quest';

export type QuestProgressRow = {
  id: number;
  quest_id: string;
  date: string; // UTC day key for user's local day
  value: number;
  done: number; // 0/1
  updated_at: number;
};

export type QuestStreakRow = {
  quest_id: string;
  count: number;
  last_date: string; // UTC day key for user's local day
};

export type QuestHistoryRow = {
  id: number;
  quest_id: string;
  date: string; // UTC day key for user's local day
  timestamp: number;
  title: string | null;
  reward_points: number | null;
  reward_tag: string | null;
  note: string | null;
  streak_count: number | null;
};

export type QuestPointsRow = {
  tag: string;
  points: number;
};

export const QuestRepository = {
  async getAllProgressForToday(): Promise<QuestProgressRow[]> {
    const db = await getDatabase();
    const today = localDayKeyUtc(new Date());
    return db.getAllAsync<QuestProgressRow>(
      `SELECT id, quest_id, date, value, done, updated_at
       FROM quest_progress
       WHERE date = ?
       ORDER BY updated_at DESC`,
      [today]
    );
  },

  async getTodayProgress(questId: QuestId): Promise<QuestProgressRow | null> {
    const db = await getDatabase();
    const today = localDayKeyUtc(new Date());
    const row = await db.getFirstAsync<QuestProgressRow>(
      `SELECT id, quest_id, date, value, done, updated_at
       FROM quest_progress
       WHERE quest_id = ? AND date = ?
       LIMIT 1`,
      [questId, today]
    );
    return row ?? null;
  },

  async upsertProgress(
    questId: QuestId,
    date: string,
    value: number,
    done: boolean
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO quest_progress(quest_id, date, value, done, updated_at)
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(quest_id, date) DO UPDATE SET
         value = excluded.value,
         done = excluded.done,
         updated_at = excluded.updated_at`,
      [questId, date, value, done ? 1 : 0, now]
    );
  },

  async getAllStreaks(): Promise<QuestStreakRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestStreakRow>(
      `SELECT quest_id, count, last_date FROM quest_streaks`
    );
  },

  async getStreak(questId: QuestId): Promise<QuestStreakRow | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<QuestStreakRow>(
      `SELECT quest_id, count, last_date FROM quest_streaks WHERE quest_id = ? LIMIT 1`,
      [questId]
    );
    return row ?? null;
  },

  async upsertStreak(
    questId: QuestId,
    count: number,
    lastDate: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_streaks(quest_id, count, last_date)
       VALUES(?, ?, ?)
       ON CONFLICT(quest_id) DO UPDATE SET
         count = excluded.count,
         last_date = excluded.last_date`,
      [questId, count, lastDate]
    );
  },

  async addPoints(tag: RewardTag, delta: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO quest_points(tag, points) VALUES(?, ?)
       ON CONFLICT(tag) DO UPDATE SET points = quest_points.points + excluded.points`,
      [tag, delta]
    );
  },

  async getAllPoints(): Promise<QuestPointsRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<QuestPointsRow>(
      `SELECT tag, points FROM quest_points`
    );
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

  async completeQuestAtomic(params: {
    questId: QuestId;
    title: string;
    targetValue: number;
    rewardPoints: number;
    rewardTag: RewardTag;
    note?: string;
  }): Promise<{ questId: QuestId; date: string; streakCount: number } | void> {
    const db = await getDatabase();
    const today = localDayKeyUtc(new Date());
    const yesterday = yesterdayLocalDayKeyUtc(new Date());
    const now = Date.now();

    await db.execAsync('BEGIN TRANSACTION;');
    try {
      await db.runAsync(
        `INSERT INTO quest_progress(quest_id, date, value, done, updated_at)
         VALUES(?, ?, ?, 1, ?)
         ON CONFLICT(quest_id, date) DO UPDATE SET
           value = excluded.value,
           done = 1,
           updated_at = excluded.updated_at`,
        [params.questId, today, params.targetValue, now]
      );

      const streak = await db.getFirstAsync<QuestStreakRow>(
        `SELECT quest_id, count, last_date FROM quest_streaks WHERE quest_id = ? LIMIT 1`,
        [params.questId]
      );

      let newCount = 1;
      if (streak) {
        if (streak.last_date === today) {
          newCount = streak.count; // already counted today
        } else if (streak.last_date === yesterday) {
          newCount = streak.count + 1;
        } else {
          newCount = 1;
        }
      }

      await db.runAsync(
        `INSERT INTO quest_streaks(quest_id, count, last_date)
         VALUES(?, ?, ?)
         ON CONFLICT(quest_id) DO UPDATE SET
           count = excluded.count,
           last_date = excluded.last_date`,
        [params.questId, newCount, today]
      );

      await db.runAsync(
        `INSERT INTO quest_history(quest_id, date, timestamp, title, reward_points, reward_tag, note, streak_count)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(quest_id, date, title) DO UPDATE SET
           timestamp = excluded.timestamp,
           reward_points = excluded.reward_points,
           reward_tag = excluded.reward_tag,
           note = excluded.note,
           streak_count = excluded.streak_count`,
        [
          params.questId,
          today,
          now,
          params.title,
          params.rewardPoints,
          params.rewardTag,
          params.note ?? null,
          newCount,
        ]
      );

      await db.runAsync(
        `INSERT INTO quest_points(tag, points) VALUES(?, ?)
         ON CONFLICT(tag) DO UPDATE SET points = quest_points.points + excluded.points`,
        [params.rewardTag, params.rewardPoints]
      );

      await db.execAsync('COMMIT;');
      return { questId: params.questId, date: today, streakCount: newCount };
    } catch (err) {
      await db.execAsync('ROLLBACK;');
      throw err;
    }
  },
};

// src/services/QuestService.ts
import { localStorageService } from './LocalStorageService';

/** ===== Types ===== */

export type QuestHistoryItem = {
  // No user identifier here (privacy by design)
  questId: string;
  date: string; // 'YYYY-MM-DD'
  timestamp: number; // epoch millis
  // Optional rich fields for nicer UI
  title?: string;
  rewardPoints?: number;
  rewardTag?: string;
  note?: string;
  streakCount?: number;
};

type QuestState = { completed: boolean; lastCompletedDate: string };
type QuestStateMap = Record<string, QuestState>;

/** ===== History (persistent, append-only) ===== */

/**
 * Append one rich history record to local storage.
 * Keeps all past items unless you explicitly clear the key.
 */
export async function appendQuestHistory(
  entry: QuestHistoryItem
): Promise<void> {
  const histStr = await localStorageService.getString('questHistory');
  const history: QuestHistoryItem[] = histStr ? JSON.parse(histStr) : [];
  history.push(entry);
  await localStorageService.setString('questHistory', JSON.stringify(history));
}

/**
 * Read all history items (as-is). You can sort in the caller if needed.
 */
export async function getQuestHistory(): Promise<QuestHistoryItem[]> {
  const s = await localStorageService.getString('questHistory');
  return s ? JSON.parse(s) : [];
}

/** ===== Daily quest state (lightweight flags) ===== */

/**
 * Mark a quest as completed for "today" and store a lightweight status.
 * NOTE: If you already call `appendQuestHistory` elsewhere (recommended),
 * do NOT also rely on this function to write history, to avoid duplicates.
 */
export async function markQuestCompleted(questId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Update in-memory map of simple quest states
  const questsStr = await localStorageService.getString('quests');
  const quests: QuestStateMap = questsStr ? JSON.parse(questsStr) : {};
  quests[questId] = { completed: true, lastCompletedDate: today };
  await localStorageService.setString('quests', JSON.stringify(quests));

  // Optional minimal history write. Comment out if you already append rich history elsewhere.
  await appendQuestHistory({
    questId,
    date: today,
    timestamp: Date.now(),
  });
}

/**
 * Read the simple daily quest state map.
 */
export async function getQuests(): Promise<QuestStateMap> {
  const s = await localStorageService.getString('quests');
  return s ? JSON.parse(s) : {};
}

/**
 * On app start, if the saved "completed" flags are from a previous day,
 * reset only the `completed` field to false but keep all history entries.
 */
export async function resetDailyQuestsIfNewDay(): Promise<void> {
  const questsStr = await localStorageService.getString('quests');
  const quests: QuestStateMap = questsStr ? JSON.parse(questsStr) : {};
  const today = new Date().toISOString().split('T')[0];

  let changed = false;
  Object.keys(quests).forEach(questId => {
    const q = quests[questId];
    if (q?.completed && q.lastCompletedDate !== today) {
      quests[questId].completed = false;
      changed = true;
    }
  });

  if (changed) {
    await localStorageService.setString('quests', JSON.stringify(quests));
  }
}

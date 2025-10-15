export type QuestFrequency = 'daily' | 'weekly';

// Five quests you want to implement
export type QuestId =
  | 'drink_2l'
  | 'haze_mask_today'
  | 'nature_walk_10m'
  | 'calm_breath_5m'
  | 'gratitude_note';

export type RewardTag = 'skin' | 'lung' | 'stress' | 'calm' | 'happiness';

export interface QuestDef {
  id: QuestId;
  title: string;
  description?: string;
  frequency: QuestFrequency; // Daily for all five quests here
  target: number; // e.g. 2000 ml or 1 boolean completion
  unit: 'ml' | 'count' | 'bool';
  rewardPoints: number; // base reward points
  rewardTag: RewardTag; // used by Twin visuals
  enabledWhen?: { aqiMin?: number }; // e.g. Haze quest only if AQI >= threshold
}

export interface Quest {
  id: QuestId;
  title: string;
  description: string;
  completed: boolean;
  lastCompletedDate?: string; // store last completion date (YYYY-MM-DD)
}

export interface QuestProgress {
  id: QuestId;
  dateKey: string; // 'YYYY-MM-DD'
  value: number; // numeric progress for ml/count/bool(1)
  done: boolean;
  updatedAt: number;
}

export interface Streak {
  id: QuestId;
  count: number; // consecutive days
  lastDate: string; // 'YYYY-MM-DD'
}

export interface Badge {
  id: 'hydration_7' | 'smog_free_hero' | 'outdoor_5' | 'calm_7' | 'gratitude_7';
  title: string;
  unlockedAt: number;
}

// AC 6.1.3: quest history item to be shown chronologically
export interface CompletedLog {
  questId: QuestId;
  title: string;
  rewardPoints: number; // base + bonus if any
  rewardTag: RewardTag;
  completedAt: number; // timestamp
  streakCount: number; // streak on that completion
  note?: string; // optional (e.g., gratitude content)
}

// For Twin visuals timing requirement (AC 6.2.2)
export interface VisualEffectEvent {
  id: string;
  tag: RewardTag; // determines which visual to show
  addedAt: number; // completion time
}

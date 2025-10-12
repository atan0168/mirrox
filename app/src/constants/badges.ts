import type { QuestId } from '../models/quest';

export type BadgeId =
  | 'streak7_drink'
  | 'streak7_mask'
  | 'streak7_walk'
  | 'streak7_breathe'
  | 'streak7_gratitude';

export const BADGE_DEFS: Record<
  BadgeId,
  {
    title: string;
    encouragement: string;
    points: number;
    desc: string;
    icon: string;
  }
> = {
  streak7_drink: {
    title: '7-Day Hydration Master',
    encouragement: 'Amazing streak—your twin looks more radiant and resilient.',
    points: 40,
    desc: 'Completed "Drink 2L of water" for 7 consecutive days.',
    icon: '💧',
  },
  streak7_mask: {
    title: 'Smog-Free Survival Hero',
    encouragement: 'Your twin stands stronger against the haze. Keep it up!',
    points: 40,
    desc: 'Wore a protective mask on hazy days for 7 consecutive days.',
    icon: '😷',
  },
  streak7_walk: {
    title: 'Nature Explorer',
    encouragement: '7 days of nature time—grounded and refreshed!',
    points: 40,
    desc: 'Completed "10-min walk outdoors" for 7 consecutive days.',
    icon: '🚶‍♂️',
  },
  streak7_breathe: {
    title: 'Calm Master',
    encouragement: '7 days of calm breaths—mind like water.',
    points: 40,
    desc: 'Completed "5-min calm breathing" for 7 consecutive days.',
    icon: '🌬️',
  },
  streak7_gratitude: {
    title: 'Gratitude Champion',
    encouragement: 'A grateful week—warmth radiates from your twin!',
    points: 40,
    desc: 'Wrote a gratitude note for 7 consecutive days.',
    icon: '💖',
  },
};

export const QUEST_BADGE_RULES: Array<{
  questId: QuestId;
  threshold: number;
  badgeId: BadgeId;
}> = [
  { questId: 'drink_2l', threshold: 7, badgeId: 'streak7_drink' },
  { questId: 'haze_mask_today', threshold: 7, badgeId: 'streak7_mask' },
  { questId: 'nature_walk_10m', threshold: 7, badgeId: 'streak7_walk' },
  { questId: 'calm_breath_5m', threshold: 7, badgeId: 'streak7_breathe' },
  { questId: 'gratitude_note', threshold: 7, badgeId: 'streak7_gratitude' },
];

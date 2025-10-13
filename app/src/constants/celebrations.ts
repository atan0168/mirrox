import type { BadgeId } from './badges';

export const CELEBRATION_ANIMATION = 'celebration_dance';
export const CELEBRATION_FALLBACK_ANIMATION = 'hype_dance';

export const CELEBRATION_ANIMATIONS_BY_BADGE: Partial<Record<BadgeId, string>> =
  {
    streak7_drink: 'hype_dance',
    streak7_mask: 'hype_dance',
    streak7_walk: 'hype_dance',
    streak7_breathe: 'hype_dance',
    streak7_gratitude: 'hype_dance',
  };

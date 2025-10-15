import { QuestDef } from '../models/quest';

export function generateQuests(params: {
  aqi?: number;
  hydrationDailyTargetMl?: number;
}): QuestDef[] {
  const qs: QuestDef[] = [];

  // 1) Always show hydration to satisfy AC 6.1.1
  qs.push({
    id: 'drink_2l',
    title: 'Hydration Goal: Drink water',
    description: '+10 Skin Glow.',
    frequency: 'daily',
    target: params.hydrationDailyTargetMl ?? 2000,
    unit: 'ml',
    rewardPoints: 10,
    rewardTag: 'skin',
  });

  // 2) Haze mask quest only if AQI is high
  if ((params.aqi ?? 0) >= 100) {
    qs.push({
      id: 'haze_mask_today',
      title: 'Haze Quest: Wear a mask today',
      description: '+5 Lung Health.',
      frequency: 'daily',
      target: 1,
      unit: 'bool',
      rewardPoints: 5,
      rewardTag: 'lung',
      enabledWhen: { aqiMin: 100 },
    });
  }

  // 3) Nature walk 10 min (simple boolean completion)
  qs.push({
    id: 'nature_walk_10m',
    title: 'Nature Quest: 10-min walk outdoors',
    description: 'Reduce your twin’s stress aura.',
    frequency: 'daily',
    target: 1,
    unit: 'bool',
    rewardPoints: 8,
    rewardTag: 'stress',
  });

  // 4) Calm breathing 5 min (simple boolean completion or timer later)
  qs.push({
    id: 'calm_breath_5m',
    title: 'Mind Quest: 5-min calm breathing',
    description: '+6 Calm Points.',
    frequency: 'daily',
    target: 1,
    unit: 'bool',
    rewardPoints: 6,
    rewardTag: 'calm',
  });

  // 5) Gratitude (one sentence)
  qs.push({
    id: 'gratitude_note',
    title: "Gratitude Quest: one thing you're grateful for",
    description: '+5 Happiness Aura.',
    frequency: 'daily',
    target: 1,
    unit: 'bool',
    rewardPoints: 5,
    rewardTag: 'happiness',
  });

  return qs;
}

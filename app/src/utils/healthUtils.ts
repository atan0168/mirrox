export function computeEnergy(steps: number, sleepMinutes: number) {
  const sleepHours = sleepMinutes / 60;
  // Sleep score: 8h optimal, 6-9h good, <5h poor
  const sleepOptimal = 8;
  const sleepMin = 4;
  const sleepMax = 9.5;
  const clampedSleep = Math.max(sleepMin, Math.min(sleepMax, sleepHours));
  const sleepScore = (clampedSleep - sleepMin) / (sleepOptimal - sleepMin);

  // Steps score: 10k as 1.0, 3k as 0.0 baseline
  const stepsGoal = 10000;
  const stepsBaseline = 3000;
  const stepsScore = Math.max(
    0,
    Math.min(1, (steps - stepsBaseline) / (stepsGoal - stepsBaseline))
  );

  // Weighted energy
  const energy = Math.max(0, Math.min(1, 0.6 * sleepScore + 0.4 * stepsScore));

  let state: 'low' | 'moderate' | 'high' = 'moderate';
  if (energy < 0.4) state = 'low';
  else if (energy > 0.75) state = 'high';

  const speedScale = state === 'low' ? 0.85 : state === 'high' ? 1.15 : 1.0;

  let message: string | null = null;
  if (state === 'low') {
    // Only flag low sleep if we actually have sleep data (> 0 minutes)
    if (sleepMinutes > 0 && sleepHours < 6)
      message = 'Low sleep — take it easy today.';
    else message = 'Warming up — a short walk helps.';
  } else if (state === 'high') {
    message = 'Great energy today!';
  }

  return { energy, state, speedScale, message, sleepHours } as const;
}

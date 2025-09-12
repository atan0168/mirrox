import type { HealthHistory, HealthSnapshot } from '../../models/Health';
import { minutesSinceLocalMidnight } from '../../utils/datetimeUtils';
import { getTierForSleepMinutes } from '../../utils/healthUtils';
import { average, stdDev } from '../../utils/mathUtils';

export type InsightTier = 1 | 2 | 3;

export interface InsightCandidate {
  id: string;
  tier: InsightTier;
  title: string;
  body: string;
  source: string;
  sourceUrl: string;
  // Short transparency note about data used
  dataNote?: string;
}

export interface EvaluateOptions {
  now?: Date;
}

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function transparencyNoteFromSnapshot(s: HealthSnapshot): string {
  const have: string[] = [];
  if (typeof s.sleepMinutes === 'number') have.push('sleep duration');
  if (s.sleepStart) have.push('bedtime');
  if (typeof s.restingHeartRateBpm === 'number')
    have.push('resting heart rate');
  if (typeof s.hrvMs === 'number') have.push('HRV');
  if (typeof s.steps === 'number') have.push('steps');
  if (typeof s.timeInBedMinutes === 'number') have.push('time in bed');
  if (typeof s.sleepDeepMinutes === 'number') have.push('deep sleep');
  if (typeof s.sleepRemMinutes === 'number') have.push('REM');
  return have.length
    ? `Uses your recent ${have.join(', ')} data to personalize.`
    : 'Uses your recent sleep and activity data to personalize.';
}

export function evaluateSleepHealthInsights(
  history: HealthHistory,
  options: EvaluateOptions = {}
): InsightCandidate[] {
  const now = options.now ?? new Date();
  const snapshots = (history.snapshots || []).filter(s => !!s);
  if (snapshots.length === 0) return [];
  const latest = snapshots[snapshots.length - 1];
  const tier = getTierForSleepMinutes(latest.sleepMinutes);
  if (!tier) return [];

  const dataNote = transparencyNoteFromSnapshot(latest);

  // Helper arrays
  const last7 = lastN(snapshots, 7);
  const last14 = lastN(snapshots, 14);
  const last30 = lastN(snapshots, 30);

  const candidates: InsightCandidate[] = [];

  // TIER 1: Critically Low Sleep (< 5 hours)
  if (tier === 1) {
    // Highly Inconsistent Bedtime: std dev of bedtime over last 7 days > 90 min
    const bedtimes = last7
      .map(s => (s.sleepStart ? minutesSinceLocalMidnight(s.sleepStart) : null))
      .filter((v): v is number => v != null);
    if (bedtimes.length >= 4) {
      const sd = stdDev(bedtimes);
      if (sd > 90) {
        candidates.push({
          id: 'tier1_bedtime_variability',
          tier: 1,
          title: "Let's Stabilize Your Sleep Clock ⏰",
          body: "Your bedtime varied by over 90 minutes this week. A consistent sleep schedule is the single most effective way to improve sleep. Let's aim for the same bedtime tonight.",
          source: 'Johns Hopkins Medicine',
          sourceUrl:
            'https://www.hopkinsmedicine.org/health/wellness-and-prevention/sticking-to-a-sleep-schedule',
          dataNote,
        });
      }
    }

    // Elevated Resting Heart Rate During Sleep: today > 10% above 30-day baseline
    const rhrToday = latest.restingHeartRateBpm ?? null;
    const rhrBaseline = average(
      last30
        .map(s => s.restingHeartRateBpm || null)
        .filter((v): v is number => v != null)
    );
    if (
      rhrToday != null &&
      rhrBaseline != null &&
      rhrToday > rhrBaseline * 1.1
    ) {
      candidates.push({
        id: 'tier1_elevated_rhr',
        tier: 1,
        title: 'Your Body is Working Overtime 📈',
        body: "Your resting heart rate was higher than usual during sleep last night. This can mean your body isn't fully recovering. Prioritizing rest and a calming wind-down routine tonight is key.",
        source: 'Cleveland Clinic',
        sourceUrl:
          'https://health.clevelandclinic.org/why-is-my-resting-heart-rate-so-high-at-night/',
        dataNote,
      });
    }

    // Very Low Physical Activity: avg steps over last 3 days < 4,000
    const steps3Avg = average(
      lastN(snapshots, 3).map(s => (typeof s.steps === 'number' ? s.steps : 0))
    );
    if (steps3Avg != null && steps3Avg < 4000) {
      candidates.push({
        id: 'tier1_low_activity',
        tier: 1,
        title: 'Move a Little, Sleep a Lot Better',
        body: "We've noticed lower activity levels recently. Even a 20-minute walk today can help build natural sleep pressure and improve your rest tonight.",
        source: 'CDC',
        sourceUrl: 'https://www.cdc.gov/physical-activity-basics/benefits/',
        dataNote,
      });
    }
  }

  // TIER 2: Moderately Low Sleep (5 to < 6.5 hours)
  if (tier === 2) {
    // High Sleep Latency: Time in Bed consistently > 30 min longer than Time Asleep
    const latencies = lastN(snapshots, 3)
      .map(s => {
        if (
          typeof s.timeInBedMinutes === 'number' &&
          typeof s.sleepMinutes === 'number'
        ) {
          return s.timeInBedMinutes - s.sleepMinutes;
        }
        return null;
      })
      .filter((v): v is number => v != null);
    const highLatencyCount = latencies.filter(d => d >= 30).length;
    if (latencies.length >= 2 && highLatencyCount >= 2) {
      candidates.push({
        id: 'tier2_high_latency',
        tier: 2,
        title: 'Trouble Falling Asleep? 🧠',
        body: "It seems to be taking you a while to drift off. A 30-minute 'wind-down' routine away from screens can help signal to your brain that it's time for bed.",
        source: 'American Academy of Sleep Medicine',
        sourceUrl: 'https://aasm.org/7-tips-for-better-sleep-in-the-new-year/',
        dataNote,
      });
    }

    // Low HRV: today HRV significantly below baseline
    const hrvToday = latest.hrvMs ?? null;
    const hrvBaseline = average(
      last30
        .map(s => (typeof s.hrvMs === 'number' ? s.hrvMs : null))
        .filter((v): v is number => v != null)
    );
    if (
      hrvToday != null &&
      hrvBaseline != null &&
      hrvToday < hrvBaseline * 0.8
    ) {
      candidates.push({
        id: 'tier2_low_hrv',
        tier: 2,
        title: 'Time for Recovery 🧘',
        body: 'Your HRV was low last night, suggesting your body needs more recovery. Gentle activities like meditation or stretching before bed can help your nervous system relax.',
        source: 'Harvard Health Publishing',
        sourceUrl:
          'https://www.health.harvard.edu/blog/heart-rate-variability-new-way-track-well-2017112212789',
        dataNote,
      });
    }

    // Late-Night Intense Workout: Not enough granularity without workout end times/energy
    // If workout timing becomes available, implement as: workout.end <= avgBedtime + 3h
  }

  // TIER 3: Mildly Low Sleep (6.5 to < 7.5 hours)
  if (tier === 3) {
    // Low Deep Sleep %: < 15% for 2+ nights
    const deepFlags = lastN(snapshots, 3).map(s => {
      if (typeof s.sleepMinutes === 'number' && s.sleepMinutes > 0) {
        const deep = s.sleepDeepMinutes ?? null;
        if (deep == null) return null;
        const pct = (deep / s.sleepMinutes) * 100;
        return pct < 15;
      }
      return null;
    });
    const deepLowCount = deepFlags.filter(v => v === true).length;
    if (deepLowCount >= 2) {
      candidates.push({
        id: 'tier3_low_deep',
        tier: 3,
        title: 'Boost Your Physical Recovery 🛠️',
        body: 'Your deep sleep was a bit low last night. This is the stage for physical repair. A cool room and avoiding alcohol in the evening can help increase it.',
        source: 'Sleep Foundation',
        sourceUrl: 'https://www.sleepfoundation.org/stages-of-sleep/deep-sleep',
        dataNote,
      });
    }

    // Low REM Sleep %: < 18% for 2+ nights
    const remFlags = lastN(snapshots, 3).map(s => {
      if (typeof s.sleepMinutes === 'number' && s.sleepMinutes > 0) {
        const rem = s.sleepRemMinutes ?? null;
        if (rem == null) return null;
        const pct = (rem / s.sleepMinutes) * 100;
        return pct < 18;
      }
      return null;
    });
    const remLowCount = remFlags.filter(v => v === true).length;
    if (remLowCount >= 2) {
      candidates.push({
        id: 'tier3_low_rem',
        tier: 3,
        title: 'Sharpen Your Mind with REM 🧠',
        body: 'You logged less REM sleep, which is vital for memory and learning. Waking up at the same time each day (even weekends!) helps protect this crucial sleep stage.',
        source:
          'National Institute of Neurological Disorders and Stroke (NINDS)',
        sourceUrl:
          'https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-understanding-sleep',
        dataNote,
      });
    }

    // High Number of Awakenings: > 3
    if (
      typeof latest.awakeningsCount === 'number' &&
      latest.awakeningsCount > 3
    ) {
      const severe = latest.awakeningsCount >= 6;
      const advice = severe
        ? 'If this continues, consider checking in with a healthcare professional to rule out underlying causes.'
        : '';
      candidates.push({
        id: severe ? 'tier3_many_awakenings_severe' : 'tier3_many_awakenings',
        tier: 3,
        title: 'Aim for Uninterrupted Sleep',
        body: `It looks like you woke up a few times last night. This can fragment your sleep. Simple things like limiting fluids before bed and ensuring your room is pitch-black can help. ${advice}`.trim(),
        source: 'Mayo Clinic',
        sourceUrl:
          'https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/sleep/art-20048379',
        dataNote,
      });
    }
  }

  // Sort by tier priority (1 highest), then keep insertion order
  candidates.sort((a, b) => a.tier - b.tier);
  return candidates;
}

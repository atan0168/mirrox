import { useCallback, useEffect, useMemo, useRef } from 'react';

import { getAnimationCycleForAQI } from '../utils/animationUtils';

type StressLevel = 'none' | 'mild' | 'moderate' | 'high';

export interface AnimationEngineContext {
  activeAnimation: string | null;
  isManualAnimation: boolean;
  sleepMode: boolean;
  stressLevel: StressLevel;
  stressVisualsEnabled: boolean;
  isSweatyWeather: boolean;
  isSleepDeprived: boolean;
  hasNearbyDengueRisk: boolean;
  recommendedAnimation: string | null;
  aqi: number | null;
  aqiReason: string;
}

export interface AnimationEntry {
  name: string;
  durationMs: number;
}

type AnimationPlan =
  | { type: 'manual'; name: string | null }
  | { type: 'idle'; reason: string }
  | { type: 'single'; name: string | null; reason: string; durationMs?: number }
  | { type: 'cycle'; entries: AnimationEntry[]; reason: string };

const DEFAULT_ANIMATION_DURATIONS: Record<string, number> = {
  sleeping: 12000,
  sleeping_idle: 12000,
  M_Standing_Expressions_007: 4800,
  breathing: 6000,
  wiping_sweat: 6000,
  swat_bugs: 7400,
  yawn: 5000,
  slump: 10000,
};

const getAnimationDuration = (name: string, fallback: number = 6000) => {
  return DEFAULT_ANIMATION_DURATIONS[name] ?? fallback;
};

const buildModerateAQICycle = (
  context: AnimationEngineContext
): AnimationEntry[] => {
  const breathingEntry: AnimationEntry = {
    name: 'breathing',
    durationMs: getAnimationDuration('breathing'),
  };

  const extras: AnimationEntry[] = [];

  if (context.isSweatyWeather) {
    extras.push({
      name: 'wiping_sweat',
      durationMs: getAnimationDuration('wiping_sweat'),
    });
  }

  if (context.isSleepDeprived) {
    extras.push({
      name: 'yawn',
      durationMs: getAnimationDuration('yawn', 5000),
    });
  }

  if (context.hasNearbyDengueRisk && !context.sleepMode) {
    extras.push({
      name: 'swat_bugs',
      durationMs: getAnimationDuration('swat_bugs'),
    });
  }

  if (extras.length === 0) {
    return [breathingEntry];
  }

  const cycle: AnimationEntry[] = [];

  extras.forEach(extra => {
    if (cycle.length === 0 || cycle[cycle.length - 1].name !== 'breathing') {
      cycle.push({ ...breathingEntry });
    }
    cycle.push(extra);
  });

  return cycle;
};

const buildUnhealthyAQICycle = (
  context: AnimationEngineContext
): AnimationEntry[] => {
  const base = getAnimationCycleForAQI(context.aqi);
  const entries = new Map<string, AnimationEntry>();

  base.forEach(name => {
    entries.set(name, {
      name,
      durationMs: getAnimationDuration(name),
    });
  });

  if (!context.stressVisualsEnabled) {
    entries.delete('breathing');
  }

  if (context.isSleepDeprived) {
    entries.set('yawn', {
      name: 'yawn',
      durationMs: getAnimationDuration('yawn', 5000),
    });
  }

  if (context.isSweatyWeather) {
    entries.set('wiping_sweat', {
      name: 'wiping_sweat',
      durationMs: getAnimationDuration('wiping_sweat'),
    });
  }

  if (context.hasNearbyDengueRisk && !context.sleepMode) {
    entries.set('swat_bugs', {
      name: 'swat_bugs',
      durationMs: getAnimationDuration('swat_bugs'),
    });
  }

  return Array.from(entries.values());
};

const plansEqual = (a: AnimationPlan | null, b: AnimationPlan | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;

  if (a.type === 'manual' || a.type === 'single') {
    return a.name === (b as typeof a).name;
  }

  if (a.type === 'idle') {
    return true;
  }

  if (a.type === 'cycle') {
    const planB = b as typeof a;
    if (a.entries.length !== planB.entries.length) return false;
    for (let i = 0; i < a.entries.length; i++) {
      if (
        a.entries[i].name !== planB.entries[i].name ||
        a.entries[i].durationMs !== planB.entries[i].durationMs
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const buildAnimationPlan = (context: AnimationEngineContext): AnimationPlan => {
  if (context.isManualAnimation) {
    return { type: 'manual', name: context.activeAnimation };
  }

  if (context.sleepMode) {
    return {
      type: 'cycle',
      reason: 'Sleep mode cycle',
      entries: [
        {
          name: 'sleeping',
          durationMs: getAnimationDuration('sleeping', 12000),
        },
        {
          name: 'sleeping_idle',
          durationMs: getAnimationDuration('sleeping_idle', 12000),
        },
      ],
    };
  }

  if (context.stressLevel === 'high' && context.stressVisualsEnabled) {
    return {
      type: 'single',
      name: 'M_Standing_Expressions_007',
      reason: 'High HRV stress detected',
      durationMs: getAnimationDuration('M_Standing_Expressions_007'),
    };
  }

  const aqi = context.aqi;
  const recommended = context.recommendedAnimation;

  const isModerateAQI =
    recommended === 'breathing' &&
    typeof aqi === 'number' &&
    aqi > 50 &&
    aqi <= 100;

  if (isModerateAQI) {
    const cycleEntries = buildModerateAQICycle(context);
    if (cycleEntries.length <= 1) {
      return {
        type: 'single',
        name: cycleEntries[0]?.name ?? recommended,
        reason: context.aqiReason,
        durationMs: cycleEntries[0]?.durationMs,
      };
    }

    return {
      type: 'cycle',
      reason: context.aqiReason,
      entries: cycleEntries,
    };
  }

  const isUnhealthyAQI = typeof aqi === 'number' && aqi >= 101;
  if (isUnhealthyAQI && recommended) {
    const cycleEntries = buildUnhealthyAQICycle(context);
    if (cycleEntries.length <= 1) {
      return {
        type: 'single',
        name: cycleEntries[0]?.name ?? recommended,
        reason: context.aqiReason,
        durationMs: cycleEntries[0]?.durationMs,
      };
    }

    return {
      type: 'cycle',
      reason: context.aqiReason,
      entries: cycleEntries,
    };
  }

  if (recommended) {
    return {
      type: 'single',
      name: recommended,
      reason: context.aqiReason,
      durationMs: getAnimationDuration(recommended),
    };
  }

  if (context.isSweatyWeather) {
    return {
      type: 'single',
      name: 'wiping_sweat',
      reason: 'Hot and humid weather',
      durationMs: getAnimationDuration('wiping_sweat'),
    };
  }

  if (
    context.isSleepDeprived &&
    !context.sleepMode &&
    context.stressLevel === 'none'
  ) {
    return {
      type: 'single',
      name: 'slump',
      reason: 'Sleep deprivation posture',
      durationMs: getAnimationDuration('slump'),
    };
  }

  if (context.hasNearbyDengueRisk) {
    return {
      type: 'cycle',
      reason: 'Nearby dengue risk - swat cycle',
      entries: [
        {
          name: 'swat_bugs',
          durationMs: getAnimationDuration('swat_bugs'),
        },
        {
          name: 'M_Standing_Idle_Variations_007',
          durationMs: getAnimationDuration(
            'M_Standing_Idle_Variations_007',
            7000
          ),
        },
      ],
    };
  }

  return {
    type: 'idle',
    reason: 'No automatic animation selected',
  };
};

interface UseAvatarAnimationEngineParams {
  context: AnimationEngineContext;
  setActiveAnimation: (
    anim: string | null,
    opts?: { manual?: boolean }
  ) => void;
  isActive?: boolean;
}

export const useAvatarAnimationEngine = ({
  context,
  setActiveAnimation,
  isActive = true,
}: UseAvatarAnimationEngineParams) => {
  const planRef = useRef<AnimationPlan | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef(context);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const stopCycle = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetEngine = useCallback(() => {
    stopCycle();
    planRef.current = null;
  }, [stopCycle]);

  const playCycleEntry = useCallback(
    (plan: Extract<AnimationPlan, { type: 'cycle' }>, index: number) => {
      stopCycle();

      if (!plan.entries.length) {
        if (contextRef.current.activeAnimation !== null) {
          setActiveAnimation(null);
        }
        return;
      }

      const nextIndex = index % plan.entries.length;
      const entry = plan.entries[nextIndex];

      if (!isActiveRef.current) {
        if (contextRef.current.activeAnimation !== null) {
          setActiveAnimation(null);
        }
        return;
      }

      if (contextRef.current.activeAnimation !== entry.name) {
        setActiveAnimation(entry.name);
      }

      timerRef.current = setTimeout(() => {
        if (!isActiveRef.current) {
          stopCycle();
          if (contextRef.current.activeAnimation !== null) {
            setActiveAnimation(null);
          }
          return;
        }
        playCycleEntry(plan, nextIndex + 1);
      }, entry.durationMs);
    },
    [setActiveAnimation, stopCycle]
  );

  useEffect(() => {
    isActiveRef.current = isActive;

    if (!isActive) {
      stopCycle();
      planRef.current = null;
      if (contextRef.current.activeAnimation !== null) {
        setActiveAnimation(null);
      }
      return;
    }

    const plan = buildAnimationPlan(context);

    if (plansEqual(planRef.current, plan)) {
      return;
    }

    stopCycle();
    planRef.current = plan;

    if (plan.type === 'manual') {
      return;
    }

    if (plan.type === 'idle') {
      if (context.activeAnimation !== null) {
        setActiveAnimation(null);
      }
      return;
    }

    if (plan.type === 'single') {
      if (context.activeAnimation !== plan.name) {
        setActiveAnimation(plan.name ?? null);
      }
      return;
    }

    const cyclePlan = plan;
    const startFrom = context.activeAnimation;
    const startIndex = startFrom
      ? cyclePlan.entries.findIndex(entry => entry.name === startFrom)
      : -1;

    playCycleEntry(cyclePlan, startIndex >= 0 ? startIndex : 0);
  }, [context, isActive, playCycleEntry, setActiveAnimation, stopCycle]);

  useEffect(() => {
    return () => {
      stopCycle();
    };
  }, [stopCycle]);

  return useMemo(
    () => ({
      resetEngine,
    }),
    [resetEngine]
  );
};

export default useAvatarAnimationEngine;

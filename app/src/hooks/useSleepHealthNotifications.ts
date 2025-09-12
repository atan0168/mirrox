import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SleepHealthNotifier } from '../services/SleepHealthNotifier';

function dayKey(d = new Date()): string {
  return d.toDateString();
}

// Evaluates sleep/health patterns and sends at most one supportive, sourced notification
// per day, respecting user preferences and permissions.
export function useSleepHealthNotifications() {
  const lastEvalDayRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const evaluate = async () => {
    try {
      const todayKey = dayKey();
      if (lastEvalDayRef.current === todayKey) return;
      await SleepHealthNotifier.evaluateAndNotifyNow();
      lastEvalDayRef.current = todayKey;
    } catch {}
  };

  useEffect(() => {
    // Evaluate once on mount
    evaluate();

    // Evaluate when app becomes active
    const sub = AppState.addEventListener('change', async nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && prev !== 'active') {
        await evaluate();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

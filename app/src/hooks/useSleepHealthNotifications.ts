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
    const todayKey = dayKey();
    if (lastEvalDayRef.current === todayKey) return;

    // Mark evaluation for today up front so concurrent triggers can't double-send
    lastEvalDayRef.current = todayKey;
    try {
      await SleepHealthNotifier.evaluateAndNotifyNow();
    } catch {
      // Allow a retry later if something went wrong
      if (lastEvalDayRef.current === todayKey) {
        lastEvalDayRef.current = null;
      }
    }
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
  }, []);
}

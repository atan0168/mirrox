import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ProactiveInsightsNotifier } from '../services/ProactiveInsightsNotifier';
import { localStorageService } from '../services/LocalStorageService';

function dayKey(d = new Date()): string {
  return d.toDateString();
}

export function useProactiveInsights() {
  const lastEvalDayRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const evaluate = async () => {
    const todayKey = dayKey();
    if (lastEvalDayRef.current === todayKey) return;

    lastEvalDayRef.current = todayKey;
    try {
      const profile = await localStorageService.getUserProfile();
      const coords = profile?.location;
      await ProactiveInsightsNotifier.evaluateAndStoreOne({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
    } catch {
      // allow retry later if failed
      if (lastEvalDayRef.current === todayKey) lastEvalDayRef.current = null;
    }
  };

  useEffect(() => {
    evaluate();
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

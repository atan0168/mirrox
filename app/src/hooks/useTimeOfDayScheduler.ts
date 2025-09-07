import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAvatarStore } from '../store/avatarStore';
import { getPhaseForDate, msUntilNextBoundary } from '../utils/timeOfDayUtils';

// Mount once (e.g., in App.tsx) to keep currentPhase in sync with real time.
// Uses precise boundary scheduling instead of fixed polling.
export function useTimeOfDayScheduler() {
  const setCurrentPhase = useAvatarStore(s => s.setCurrentPhase);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const phase = getPhaseForDate(now);
      setCurrentPhase(phase);
      const delay = msUntilNextBoundary(now);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(update, delay);
    };

    update(); // initial

    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        // Recompute immediately on foreground resume
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        update();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      sub.remove();
    };
  }, [setCurrentPhase]);
}

export default useTimeOfDayScheduler;

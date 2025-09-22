import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { runNotificationRules } from '../services/NotificationOrchestrator';

export function useProactiveInsights() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const evaluate = async () => {
    try {
      await runNotificationRules({
        allowedRules: ['hydration.nudge', 'dengue.cluster'],
      });
    } catch {
      // Allow retries if we failed due to transient issues
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

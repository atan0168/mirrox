import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AlertsRepository } from '../services/db/AlertsRepository';
import { ALERT_RETENTION_DAYS } from '../constants';

export function useAlertsAutoPurge(days: number = ALERT_RETENTION_DAYS) {
  const stateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const purge = async () => {
      try {
        await AlertsRepository.purgeOlderThan(days);
      } catch {}
    };

    purge();
    const sub = AppState.addEventListener('change', next => {
      const prev = stateRef.current;
      stateRef.current = next;
      if (next === 'active' && prev !== 'active') purge();
    });
    return () => sub.remove();
  }, [days]);
}


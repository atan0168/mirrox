import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { healthDataService } from '../services/HealthDataService';

// Lightweight auto-sync: when app becomes active, try to sync missing health data (up to 30 days).
// This relies on permissions already being granted elsewhere; if permissions are denied,
// provider methods should no-op or return empty values and we simply skip errors.
export function useHealthAutoSync(maxDays: number = 30) {
  const syncing = useRef(false);

  useEffect(() => {
    const doSync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await healthDataService.syncNeeded(maxDays);
      } catch {
        // ignore errors; manual sync/permissions flow will handle
      } finally {
        syncing.current = false;
      }
    };

    // Initial attempt once on mount
    doSync();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') doSync();
    });
    return () => sub.remove();
  }, [maxDays]);
}


import { useCallback, useEffect, useState } from 'react';
import { healthDataService } from '../services/HealthDataService';
import type { HealthSnapshot } from '../models/Health';

export function useHealthData({
  autoSync = true,
}: { autoSync?: boolean } = {}) {
  const [data, setData] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const granted = await healthDataService.requestPermissions();
      if (!granted) {
        setError('Health permissions denied');
      } else {
        setError(null);
      }
      return granted;
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    try {
      setLoading(true);
      const snapshot = await healthDataService.syncNeeded(30);
      setData(snapshot);
      setError(null);
      return snapshot;
    } catch (e: unknown) {
      let message = 'Failed to sync health data';
      if (e instanceof Error) {
        message = e.message;
      } else if (typeof e === 'object' && e !== null && 'message' in e) {
        const maybeMessage = (e as Record<string, unknown>).message;
        if (typeof maybeMessage === 'string') message = maybeMessage;
      }
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Subscribe to live updates from background/auto syncs
    const unsubscribe = healthDataService.onUpdate(snapshot => {
      if (mounted) setData(snapshot);
    });
    (async () => {
      const latest = await healthDataService.getLatest();
      if (mounted && latest) setData(latest);
      if (autoSync) {
        await sync();
      }
    })();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [autoSync, sync]);

  return {
    data,
    loading,
    error,
    requestPermissions,
    refresh: sync,
  } as const;
}

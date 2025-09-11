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
    } catch (e: any) {
      setError(e?.message || 'Failed to sync health data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const latest = await healthDataService.getLatest();
      if (mounted && latest) setData(latest);
      if (autoSync) {
        await sync();
      }
    })();
    return () => {
      mounted = false;
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

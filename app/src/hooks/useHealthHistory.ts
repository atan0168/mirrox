import { useCallback, useEffect, useState } from 'react';
import { healthDataService } from '../services/HealthDataService';
import type { HealthHistory } from '../models/Health';

export function useHealthHistory(limit: number = 7) {
  const [data, setData] = useState<HealthHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (lim: number) => {
    try {
      setLoading(true);
      // Ensure we have up-to-date snapshots for the requested window
      await healthDataService.syncNeeded(lim);
      const history = await healthDataService.getHistory(lim);
      setData(history);
      setError(null);
      return history;
    } catch (e: any) {
      const message = e?.message || 'Failed to load health history';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await healthDataService.syncNeeded(limit);
      } catch {}
      const history = await healthDataService.getHistory(limit);
      if (mounted) setData(history);
    })();
    return () => {
      mounted = false;
    };
  }, [limit]);

  const refresh = useCallback(() => load(limit), [limit, load]);

  return { data, loading, error, refresh } as const;
}

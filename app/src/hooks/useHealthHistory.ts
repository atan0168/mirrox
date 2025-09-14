import { useCallback, useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { healthDataService } from '../services/HealthDataService';
import type { HealthHistory } from '../models/Health';
import { getDeviceTimeZone, yyyymmddInTimeZone } from '../utils/datetimeUtils';

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
    // Subscribe to updates from health syncs and refresh history if within window
    const unsubscribe = healthDataService.onUpdate(async snapshot => {
      try {
        const tz = getDeviceTimeZone();
        const todayStr = yyyymmddInTimeZone(new Date(), tz);
        const startStr = yyyymmddInTimeZone(addDays(new Date(), -(limit - 1)), tz);
        if (snapshot.date >= startStr && snapshot.date <= todayStr) {
          const history = await healthDataService.getHistory(limit);
          if (mounted) setData(history);
        }
      } catch {}
    });
    (async () => {
      try {
        await healthDataService.syncNeeded(limit);
      } catch {}
      const history = await healthDataService.getHistory(limit);
      if (mounted) setData(history);
    })();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [limit]);

  const refresh = useCallback(() => load(limit), [limit, load]);

  return { data, loading, error, refresh } as const;
}

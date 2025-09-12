import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { AlertItem } from '../models/Alert';
import { AlertsService } from '../services/AlertsService';

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const all = await AlertsService.getAll(false);
      setAlerts(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { alerts, loading, refresh: load } as const;
}

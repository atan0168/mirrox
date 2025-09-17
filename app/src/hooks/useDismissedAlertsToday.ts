import { useCallback, useEffect, useState } from 'react';
import type { AlertItem } from '../models/Alert';
import { AlertsRepository } from '../services/db/AlertsRepository';

function toDayString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function useDismissedAlertsToday() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = toDayString();
      const dismissed = await AlertsRepository.getDismissedOnDate(today, 200);
      setAlerts(dismissed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { alerts, loading, refresh: load } as const;
}

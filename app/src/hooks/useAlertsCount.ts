import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AlertsService } from '../services/AlertsService';
import { subscribeAlertsChanged } from '../services/AlertsEvents';

export function useAlertsCount() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const list = await AlertsService.getAll(false);
    setCount(list.length);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh immediately when alerts change anywhere in the app
  useEffect(() => {
    const unsubscribe = subscribeAlertsChanged(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return count;
}

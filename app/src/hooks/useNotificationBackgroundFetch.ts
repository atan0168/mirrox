import { useEffect } from 'react';
import { ensureNotificationBackgroundTaskRegistered } from '../services/NotificationBackgroundService';

export function useNotificationBackgroundFetch() {
  useEffect(() => {
    ensureNotificationBackgroundTaskRegistered();
  }, []);
}

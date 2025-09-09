import { useState, useEffect, useCallback } from 'react';
import { localStorageService } from '../services/LocalStorageService';

// Global state to sync across all hook instances
let globalEnergyNotificationsEnabled: boolean = true;
let globalLoading: boolean = true;
let listeners: Set<(enabled: boolean) => void> = new Set();

const notifyListeners = (enabled: boolean) => {
  globalEnergyNotificationsEnabled = enabled;
  listeners.forEach(l => l(enabled));
};

export function useEnergyNotificationsPreference() {
  const [energyNotificationsEnabled, setEnergyNotificationsEnabled] =
    useState<boolean>(globalEnergyNotificationsEnabled);
  const [loading, setLoading] = useState<boolean>(globalLoading);

  useEffect(() => {
    const listener = (enabled: boolean) =>
      setEnergyNotificationsEnabled(enabled);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!globalLoading) {
      setEnergyNotificationsEnabled(globalEnergyNotificationsEnabled);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const enabled =
          await localStorageService.getEnergyNotificationsEnabled();
        globalEnergyNotificationsEnabled = enabled;
        setEnergyNotificationsEnabled(enabled);
        notifyListeners(enabled);
      } catch (e) {
        console.error('Failed to load energy notifications preference:', e);
        globalEnergyNotificationsEnabled = true;
        setEnergyNotificationsEnabled(true);
        notifyListeners(true);
      } finally {
        globalLoading = false;
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateEnergyNotificationsPreference = useCallback(
    async (enabled: boolean) => {
      try {
        await localStorageService.updatePreferences({
          enableEnergyNotifications: enabled,
        });
        notifyListeners(enabled);
        return true;
      } catch (e) {
        console.error('Failed to update energy notifications preference:', e);
        return false;
      }
    },
    []
  );

  return {
    energyNotificationsEnabled,
    loading,
    updateEnergyNotificationsPreference,
  } as const;
}

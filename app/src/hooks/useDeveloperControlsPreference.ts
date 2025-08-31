import { useState, useEffect, useCallback } from 'react';
import { localStorageService } from '../services/LocalStorageService';

// Global state to sync across all hook instances
let globalDeveloperControlsEnabled: boolean = false;
let globalLoading: boolean = true;
let listeners: Set<(enabled: boolean) => void> = new Set();

// Broadcast changes to all listeners
const notifyListeners = (enabled: boolean) => {
  globalDeveloperControlsEnabled = enabled;
  listeners.forEach(listener => listener(enabled));
};

/**
 * Hook to manage developer controls preference
 * Returns the current preference and a function to update it
 * Syncs state across all instances of this hook
 */
export function useDeveloperControlsPreference() {
  const [developerControlsEnabled, setDeveloperControlsEnabled] = useState<boolean>(
    globalDeveloperControlsEnabled
  );
  const [loading, setLoading] = useState<boolean>(globalLoading);

  // Register listener for updates from other hook instances
  useEffect(() => {
    const listener = (enabled: boolean) => {
      setDeveloperControlsEnabled(enabled);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Load initial preference (only on first mount if not already loaded)
  useEffect(() => {
    if (!globalLoading) {
      // Already loaded, just sync with global state
      setDeveloperControlsEnabled(globalDeveloperControlsEnabled);
      setLoading(false);
      return;
    }

    const loadPreference = async () => {
      try {
        const enabled = await localStorageService.getDeveloperControlsEnabled();
        globalDeveloperControlsEnabled = enabled;
        setDeveloperControlsEnabled(enabled);
        notifyListeners(enabled);
      } catch (error) {
        console.error('Failed to load developer controls preference:', error);
        globalDeveloperControlsEnabled = false; // Default to disabled
        setDeveloperControlsEnabled(false);
        notifyListeners(false);
      } finally {
        globalLoading = false;
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  const updateDeveloperControlsPreference = useCallback(
    async (enabled: boolean) => {
      try {
        await localStorageService.updatePreferences({
          enableDeveloperControls: enabled,
        });

        // Update global state and notify all listeners
        notifyListeners(enabled);
        return true;
      } catch (error) {
        console.error('Failed to update developer controls preference:', error);
        return false;
      }
    },
    []
  );

  return {
    developerControlsEnabled,
    loading,
    updateDeveloperControlsPreference,
  };
}

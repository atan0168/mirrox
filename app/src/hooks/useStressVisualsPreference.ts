import { useState, useEffect, useCallback } from 'react';
import { localStorageService } from '../services/LocalStorageService';

// Global state to sync across all hook instances
let globalStressVisualsEnabled: boolean = true;
let globalLoading: boolean = true;
let listeners: Set<(enabled: boolean) => void> = new Set();

// Broadcast changes to all listeners
const notifyListeners = (enabled: boolean) => {
  globalStressVisualsEnabled = enabled;
  listeners.forEach(listener => listener(enabled));
};

/**
 * Hook to manage stress visuals preference
 * Returns the current preference and a function to update it
 * Syncs state across all instances of this hook
 */
export function useStressVisualsPreference() {
  const [stressVisualsEnabled, setStressVisualsEnabled] = useState<boolean>(
    globalStressVisualsEnabled
  );
  const [loading, setLoading] = useState<boolean>(globalLoading);

  // Register listener for updates from other hook instances
  useEffect(() => {
    const listener = (enabled: boolean) => {
      setStressVisualsEnabled(enabled);
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
      setStressVisualsEnabled(globalStressVisualsEnabled);
      setLoading(false);
      return;
    }

    const loadPreference = async () => {
      try {
        const enabled = await localStorageService.getStressVisualsEnabled();
        globalStressVisualsEnabled = enabled;
        setStressVisualsEnabled(enabled);
        notifyListeners(enabled);
      } catch (error) {
        console.error('Failed to load stress visuals preference:', error);
        globalStressVisualsEnabled = true; // Default to enabled
        setStressVisualsEnabled(true);
        notifyListeners(true);
      } finally {
        globalLoading = false;
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  const updateStressVisualsPreference = useCallback(
    async (enabled: boolean) => {
      try {
        await localStorageService.updatePreferences({
          enableStressVisuals: enabled,
        });

        // Update global state and notify all listeners
        notifyListeners(enabled);
        return true;
      } catch (error) {
        console.error('Failed to update stress visuals preference:', error);
        return false;
      }
    },
    []
  );

  return {
    stressVisualsEnabled,
    loading,
    updateStressVisualsPreference,
  };
}

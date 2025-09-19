import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSandboxPreference } from './useSandboxPreference';
import { useSandboxStore } from '../store/sandboxStore';

export function useSandboxSync() {
  const { sandboxEnabled } = useSandboxPreference();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { setEnabled } = useSandboxStore.getState();
    setEnabled(sandboxEnabled);

    if (!sandboxEnabled) {
      queryClient.invalidateQueries({
        predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'aqicnAirQuality',
      });
      queryClient.invalidateQueries({
        predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'dengueNearby',
      });
      queryClient.invalidateQueries({
        predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'denguePredict',
      });
    }
  }, [sandboxEnabled, queryClient]);
}

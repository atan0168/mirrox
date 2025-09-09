import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';

const QUERY_KEY = ['prefs', 'energyNotifications'] as const;

export function useEnergyNotificationsPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => localStorageService.getEnergyNotificationsEnabled(),
    // Defaults previously behaved as true until loaded
    initialData: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await localStorageService.updatePreferences({
        enableEnergyNotifications: enabled,
      });
      return enabled;
    },
    onSuccess: enabled => {
      queryClient.setQueryData(QUERY_KEY, enabled);
    },
  });

  const updateEnergyNotificationsPreference = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync(enabled);
      return true;
    } catch (e) {
      console.error('Failed to update energy notifications preference:', e);
      return false;
    }
  };

  return {
    energyNotificationsEnabled: query.data ?? true,
    loading: query.isLoading || query.isFetching || mutation.isPending,
    updateEnergyNotificationsPreference,
  } as const;
}

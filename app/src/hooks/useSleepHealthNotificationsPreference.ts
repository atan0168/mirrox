import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';

const QUERY_KEY = ['prefs', 'sleepHealthNotifications'] as const;

export function useSleepHealthNotificationsPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => localStorageService.getSleepHealthNotificationsEnabled(),
    initialData: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await localStorageService.updatePreferences({
        enableSleepHealthNotifications: enabled,
      });
      return enabled;
    },
    onSuccess: enabled => {
      queryClient.setQueryData(QUERY_KEY, enabled);
    },
  });

  const updateSleepHealthNotificationsPreference = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync(enabled);
      return true;
    } catch (e) {
      console.error(
        'Failed to update sleep & health notifications preference:',
        e
      );
      return false;
    }
  };

  return {
    sleepHealthNotificationsEnabled: query.data ?? true,
    loading: query.isLoading || query.isFetching || mutation.isPending,
    updateSleepHealthNotificationsPreference,
  } as const;
}

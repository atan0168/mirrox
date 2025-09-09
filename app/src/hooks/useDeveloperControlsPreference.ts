import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';

const QUERY_KEY = ['prefs', 'developerControls'] as const;

/**
 * Hook to manage developer controls preference using React Query
 */
export function useDeveloperControlsPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => localStorageService.getDeveloperControlsEnabled(),
    // Previous default was false
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await localStorageService.updatePreferences({
        enableDeveloperControls: enabled,
      });
      return enabled;
    },
    onSuccess: enabled => {
      queryClient.setQueryData(QUERY_KEY, enabled);
    },
  });

  const updateDeveloperControlsPreference = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync(enabled);
      return true;
    } catch (error) {
      console.error('Failed to update developer controls preference:', error);
      return false;
    }
  };

  return {
    developerControlsEnabled: query.data ?? false,
    loading: query.isLoading || query.isFetching || mutation.isPending,
    updateDeveloperControlsPreference,
  } as const;
}

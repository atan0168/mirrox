import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';

const QUERY_KEY = ['prefs', 'stressVisuals'] as const;

/**
 * Hook to manage stress visuals preference using React Query
 */
export function useStressVisualsPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => localStorageService.getStressVisualsEnabled(),
    // Previous default was true
    initialData: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await localStorageService.updatePreferences({
        enableStressVisuals: enabled,
      });
      return enabled;
    },
    onSuccess: enabled => {
      queryClient.setQueryData(QUERY_KEY, enabled);
    },
  });

  const updateStressVisualsPreference = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync(enabled);
      return true;
    } catch (error) {
      console.error('Failed to update stress visuals preference:', error);
      return false;
    }
  };

  return {
    stressVisualsEnabled: query.data ?? true,
    loading: query.isLoading || query.isFetching || mutation.isPending,
    updateStressVisualsPreference,
  } as const;
}

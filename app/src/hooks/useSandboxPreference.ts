import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localStorageService } from '../services/LocalStorageService';

const QUERY_KEY = ['prefs', 'sandboxMode'] as const;

export function useSandboxPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => localStorageService.getSandboxModeEnabled(),
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await localStorageService.updatePreferences({
        enableSandboxMode: enabled,
      });
      return enabled;
    },
    onSuccess: enabled => {
      queryClient.setQueryData(QUERY_KEY, enabled);
    },
  });

  const updateSandboxPreference = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync(enabled);
      return true;
    } catch (error) {
      console.error('Failed to update sandbox mode preference:', error);
      return false;
    }
  };

  return {
    sandboxEnabled: query.data ?? false,
    loading: query.isLoading || query.isFetching || mutation.isPending,
    updateSandboxPreference,
  } as const;
}

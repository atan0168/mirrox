import { useMutation } from '@tanstack/react-query';
import {
  AnalyzeMealRequestPayload,
  AnalyzeMealResponseData,
  backendApiService,
} from '../services/BackendApiService';

export function useAnalyzeMeal() {
  return useMutation({
    mutationFn: async (
      payload: AnalyzeMealRequestPayload
    ): Promise<AnalyzeMealResponseData> =>
      backendApiService.analyzeMeal(payload),
  });
}

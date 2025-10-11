import { useMutation } from '@tanstack/react-query';
import {
  AnalyzeFoodRequestPayload,
  AnalyzeFoodResponseData,
  backendApiService,
} from '../services/BackendApiService';

export function useAnalyzeFood() {
  return useMutation({
    mutationFn: async (
      payload: AnalyzeFoodRequestPayload
    ): Promise<AnalyzeFoodResponseData> =>
      backendApiService.analyzeFood(payload),
  });
}

import { useMutation } from '@tanstack/react-query';
import {
  backendApiService,
  ExtractMealRequestPayload,
  ExtractMealResponseData,
} from '../services/BackendApiService';

export function useExtractMeal() {
  return useMutation<ExtractMealResponseData, Error, ExtractMealRequestPayload>(
    {
      mutationFn: payload => backendApiService.extractMeal(payload),
    }
  );
}

// app/src/hooks/useExtractMeal.ts
import { useMutation } from '@tanstack/react-query';
import { backendApiService } from '../services/BackendApiService';

export function useExtractMeal() {
  return useMutation({
    mutationFn: async (params: { text?: string; imageBase64?: string }) => {
      const res = await backendApiService.post('/ai/extract', {
        text: params.text,
        imageBase64: params.imageBase64,
      });
      return res.data;
    },
  });
}

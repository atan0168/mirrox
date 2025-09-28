import { useMutation } from '@tanstack/react-query';
import { backendApiService } from '../services/BackendApiService';
export type AnalyzeResp = {
  nutrients: { total: any; per_item: any[] };
  tags: string[];
  avatar_effects: {
    meter: 'fiber' | 'sugar' | 'fat' | 'sodium';
    delta: number;
    reason?: string;
  }[];
  tips: string[];
};
export function useAnalyzeMeal() {
  return useMutation({
    mutationFn: async (payload: { text?: string; imageBase64?: string }) => {
      const { data } = await backendApiService['axiosInstance'].post(
        '/food/analyze',
        payload
      );

      if (!data?.ok) throw new Error(data?.error || 'Analyze failed');
      return data.data as AnalyzeResp;
    },
  });
}

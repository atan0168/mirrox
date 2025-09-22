import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const API = 'http://10.0.2.2:3000/api';
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
      const { data } = await axios.post(`${API}/food/analyze`, payload);
      if (!data?.ok) throw new Error(data?.error || 'Analyze failed');
      return data.data as AnalyzeResp;
    },
  });
}

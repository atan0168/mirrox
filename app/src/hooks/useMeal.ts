import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMealStore } from '../store/mealStore';

type AnalysisItem = {
  name: string;
  energy_kcal?: number | null;
  qty?: number;
};

export const useMeal = () => {
  const ensureMeal = useMealStore(s => s.ensureMeal);
  const reloadItems = useMealStore(s => s.reloadItems);
  const removeItemById = useMealStore(s => s.removeItemById);
  const addManualItem = useMealStore(s => s.addManualItem);
  const appendFromAnalysis = useMealStore(s => s.appendFromAnalysis);
  const currentItems = useMealStore(s => s.currentItems);

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meal'],
    queryFn: async () => {
      await ensureMeal();
      const items = await reloadItems();
      return items ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    queryClient.setQueryData(['meal'], currentItems ?? []);
  }, [currentItems, queryClient]);

  const removeItem = useMutation({
    mutationFn: (id: number) => removeItemById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const addManual = useMutation({
    mutationFn: (p: { name: string; kcal?: number | null; qty?: number }) =>
      addManualItem(p.name, p.kcal, p.qty ?? 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const appendFromAnalysisMutation = useMutation({
    mutationFn: (items: AnalysisItem[]) => appendFromAnalysis(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  // TODO: this should be moved to the frontend
  // const quickLog = useMutation({
  //   mutationFn: async (food_id: string) => {
  //     const res = await axios.post(
  //       `${API_BASE_URL}/personalization/meal-event`,
  //       {
  //         food_id,
  //         ts_ms: Date.now(),
  //         source: 'predict',
  //       }
  //     );
  //     return res.data;
  //   },
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  // });

  return {
    ...query,
    removeItem,
    addManual,
    appendFromAnalysis: appendFromAnalysisMutation,
    // quickLog,
  };
};

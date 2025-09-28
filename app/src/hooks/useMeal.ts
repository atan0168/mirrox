// app/src/hooks/useMeal.ts
import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMealStore } from '../store/mealStore';
import axios from 'axios';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;

type AnalysisItem = {
  name: string;
  energy_kcal?: number | null;
  qty?: number;
  // keep any extra fields coming from backend
  [k: string]: any;
};

export const useMeal = () => {
  // Zustand actions
  const ensureMeal = useMealStore(s => s.ensureMeal);
  const reloadItems = useMealStore(s => s.reloadItems);
  const removeItemById = useMealStore(s => s.removeItemById);
  const addManualItem = useMealStore(s => s.addManualItem);
  const finishMeal = useMealStore(s => s.finishMeal);
  const appendFromAnalysis = useMealStore(s => s.appendFromAnalysis);

  // Subscribe to store's currentItems so we can push it into React Query cache
  const currentItems = useMealStore(s => s.currentItems);

  const queryClient = useQueryClient();

  // Main query to bootstrap data (and for refetches)
  const query = useQuery({
    queryKey: ['meal'],
    queryFn: async () => {
      await ensureMeal();
      const items = await reloadItems();
      return items ?? []; // never undefined
    },
    staleTime: 5 * 60 * 1000, // optional: cache for 5 minutes
    gcTime: 10 * 60 * 1000, // optional: garbage collect after 10 minutes
  });

  // 🔁 Instant sync: whenever the store updates, mirror it into the query cache.
  // This guarantees the ThisMealCard updates immediately after analysis append.
  useEffect(() => {
    queryClient.setQueryData(['meal'], currentItems ?? []);
  }, [currentItems, queryClient]);

  // Mutations (still useful for invalidate/refetch flows and loading states)
  const removeItem = useMutation({
    mutationFn: (id: number) => removeItemById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const addManual = useMutation({
    mutationFn: (p: { name: string; kcal?: number | null; qty?: number }) =>
      addManualItem(p.name, p.kcal, p.qty ?? 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const finish = useMutation({
    mutationFn: () => finishMeal(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const appendFromAnalysisMutation = useMutation({
    mutationFn: (items: AnalysisItem[]) => appendFromAnalysis(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  const quickLog = useMutation({
    mutationFn: async (food_id: string) => {
      const res = await axios.post(`${API_BASE}/personalization/meal-event`, {
        food_id,
        ts_ms: Date.now(),
        source: 'predict',
      });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal'] }),
  });

  return {
    ...query,
    removeItem,
    addManual,
    finish,
    appendFromAnalysis: appendFromAnalysisMutation,
    quickLog,
  };
};

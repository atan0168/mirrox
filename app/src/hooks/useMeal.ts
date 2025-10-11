import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AnalyzeFoodResponseData } from '../services/BackendApiService';
import { MealsRepository } from '../services/db/MealRepository';
import type { MealItem } from '../types/meal';
import { buildMealAnalysisFromItems } from '../utils/nutritionUtils';

type AnalysisItem = {
  name: string;
  energy_kcal?: number | null;
  qty?: number;
};

const MEAL_QUERY_KEY = ['meal'] as const;
const MEAL_ANALYSIS_QUERY_KEY = ['meal-analysis'] as const;

export const useMeal = () => {
  const queryClient = useQueryClient();

  const analysisQuery = useQuery<AnalyzeFoodResponseData | null>({
    queryKey: MEAL_ANALYSIS_QUERY_KEY,
    queryFn: async () => null,
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const analysis = analysisQuery.data;

  const setAnalysisData = useCallback(
    (next?: AnalyzeFoodResponseData | null) => {
      queryClient.setQueryData(MEAL_ANALYSIS_QUERY_KEY, next ?? null);
    },
    [queryClient]
  );

  const clearAnalysis = useCallback(() => {
    setAnalysisData(null);
  }, [setAnalysisData]);

  const syncAnalysisToItems = useCallback(
    (items: MealItem[]) => {
      if (!analysis) {
        if (!items || items.length === 0) {
          clearAnalysis();
        }
        return;
      }

      if (!items || items.length === 0) {
        clearAnalysis();
        return;
      }

      const rebuilt = buildMealAnalysisFromItems(items, analysis);
      if (rebuilt) {
        setAnalysisData(rebuilt);
      } else {
        clearAnalysis();
      }
    },
    [analysis, clearAnalysis, setAnalysisData]
  );

  const loadMealItems = useCallback(async (): Promise<MealItem[]> => {
    const mealId = await MealsRepository.ensureMealForToday();
    const rows = await MealsRepository.listMealItems(mealId);
    return rows.map(row => ({
      id: row.id,
      meal_id: row.meal_id,
      name: row.name,
      qty: row.qty ?? 1,
      energy_kcal: row.energy_kcal ?? null,
      meta: row.meta_json ? JSON.parse(row.meta_json) : undefined,
    }));
  }, []);

  const query = useQuery({
    queryKey: MEAL_QUERY_KEY,
    queryFn: loadMealItems,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      syncAnalysisToItems(query.data);
    }
  }, [query.data, syncAnalysisToItems]);

  const withRefresh = useCallback(
    async (operation: () => Promise<void>): Promise<MealItem[]> => {
      await operation();
      const freshItems = await loadMealItems();
      queryClient.setQueryData(MEAL_QUERY_KEY, freshItems);
      syncAnalysisToItems(freshItems);
      return freshItems;
    },
    [loadMealItems, queryClient, syncAnalysisToItems]
  );

  const removeItem = useMutation({
    mutationFn: (id: number) =>
      withRefresh(() => MealsRepository.deleteMealItem(id)),
  });

  const addManual = useMutation({
    mutationFn: async (p: {
      name: string;
      kcal?: number | null;
      qty?: number;
    }) => {
      const trimmed = p.name.trim();
      if (!trimmed) {
        return query.data ?? [];
      }
      return withRefresh(async () => {
        const mealId = await MealsRepository.ensureMealForToday();
        await MealsRepository.addMealItem(
          mealId,
          trimmed,
          p.kcal ?? null,
          p.qty ?? 1,
          { manual: true }
        );
      });
    },
  });

  const appendFromAnalysisMutation = useMutation({
    mutationFn: async (items: AnalysisItem[]) => {
      if (!items || items.length === 0) {
        return query.data ?? [];
      }

      return withRefresh(async () => {
        const mealId = await MealsRepository.ensureMealForToday();
        await MealsRepository.addMealItemsBulk(
          mealId,
          items.map(p => ({
            name: p.name || 'Food',
            energy: p.energy_kcal ?? null,
            qty: p.qty ?? 1,
            meta: p,
          }))
        );
      });
    },
  });

  return {
    ...query,
    analysis: analysis ?? null,
    setAnalysis: setAnalysisData,
    clearAnalysis,
    removeItem,
    addManual,
    appendFromAnalysis: appendFromAnalysisMutation,
  };
};

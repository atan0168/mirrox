import { useQuery } from '@tanstack/react-query';
import { MealsRepository, MealItemRow } from '../services/db/MealRepository';
import type { MealItem } from '../types/meal';

const mapRowToMealItem = (row: MealItemRow): MealItem => ({
  id: row.id,
  meal_id: row.meal_id,
  name: row.name,
  qty: row.qty ?? 1,
  energy_kcal: row.energy_kcal ?? null,
  meta: row.meta_json ? JSON.parse(row.meta_json) : undefined,
});

export const useMealItemsById = (mealId: number | null) =>
  useQuery({
    queryKey: ['meal-items', mealId] as const,
    enabled: mealId != null,
    queryFn: async (): Promise<MealItem[]> => {
      if (mealId == null) {
        return [];
      }

      const rows = await MealsRepository.listMealItems(mealId);
      return rows.map(mapRowToMealItem);
    },
  });

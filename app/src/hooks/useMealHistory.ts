import { useQuery } from '@tanstack/react-query';
import { MealsRepository } from '../services/db/MealRepository';
import { localDayString } from '../utils/datetimeUtils';

export type MealHistoryEntry = {
  id: number;
  dateKey: string;
  startedAt: number;
  endedAt: number | null;
  itemCount: number;
  totalEnergyKcal: number;
  displayDate: string;
};

const MEAL_HISTORY_QUERY_KEY = ['meal-history'] as const;

export const useMealHistory = () =>
  useQuery({
    queryKey: MEAL_HISTORY_QUERY_KEY,
    queryFn: async (): Promise<MealHistoryEntry[]> => {
      const rows = await MealsRepository.listMealsWithSummary();
      return rows.map(row => ({
        id: row.id,
        dateKey: row.date,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        itemCount: row.item_count,
        totalEnergyKcal: Math.round(row.total_energy_kcal ?? 0),
        displayDate: localDayString(new Date(row.started_at)),
      }));
    },
  });

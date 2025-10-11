export type MealItem = {
  id: number;
  meal_id?: number;
  name: string;
  qty: number;
  energy_kcal: number | null;
  meta?: unknown;
};

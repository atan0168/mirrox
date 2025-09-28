// app/src/store/mealStore.ts
import { create } from 'zustand';
import type { AnalyzeResp } from '../hooks/useAnalyzeMeal';
import {
  ensureMealsSchema,
  createMeal,
  closeMeal,
  insertMealItem,
  insertMealItemsBulk,
  deleteMealItem,
  listMealItems,
  getMealForToday,
} from '../db/mealsDb';

type PerItemLike = {
  id?: string;
  name: string;
  energy_kcal?: number | null;
  source?: string;
  [k: string]: any;
};

type MealItem = {
  id: number;
  meal_id?: number;
  name: string;
  qty: number;
  energy_kcal: number | null;
  meta?: any;
};

type MealState = {
  lastAnalysis?: AnalyzeResp;
  setLastAnalysis: (d?: AnalyzeResp) => void;

  currentMealId: number | null;
  currentItems: MealItem[];

  ensureMeal: () => Promise<number>;
  finishMeal: () => Promise<MealItem[]>;
  reloadItems: () => Promise<MealItem[]>;
  appendFromAnalysis: (perItems: PerItemLike[]) => Promise<MealItem[]>;
  addManualItem: (
    name: string,
    energy_kcal?: number | null,
    qty?: number
  ) => Promise<MealItem[]>;
  removeItemById: (itemId: number) => Promise<MealItem[]>;
};

export const useMealStore = create<MealState>((set, get) => ({
  lastAnalysis: undefined,
  setLastAnalysis: d => set({ lastAnalysis: d }),

  currentMealId: null,
  currentItems: [],

  ensureMeal: async () => {
    ensureMealsSchema();
    let id = get().currentMealId;
  
    if (id == null) {
      id = getMealForToday();
      if (id == null) {
        id = createMeal();
      }
      set({ currentMealId: id });
    }
  
    return id;
  },

  finishMeal: async () => {
    const id = get().currentMealId;
    if (id != null) {}
    set({ currentItems: [] });
    return [];
  },

  reloadItems: async () => {
    const id = get().currentMealId;
    if (id == null) {
      set({ currentItems: [] });
      return [];
    }
    const rows = listMealItems(id);
    const items: MealItem[] = rows.map((r: any) => ({
      id: r.id,
      meal_id: r.meal_id,
      name: r.name,
      qty: r.qty ?? 1,
      energy_kcal: r.energy_kcal ?? null,
      meta: r.meta_json ? JSON.parse(r.meta_json) : undefined,
    }));
    set({ currentItems: items });
    return items;
  },

  appendFromAnalysis: async perItems => {
    if (!perItems || perItems.length === 0) return get().currentItems;

    const mealId = await get().ensureMeal();

    insertMealItemsBulk(
      mealId,
      perItems.map(p => ({
        name: p.name || p.id || 'Food',
        energy: p.energy_kcal ?? null,
        qty: 1,
        meta: p,
      }))
    );

    return await get().reloadItems();
  },

  addManualItem: async (name, energy_kcal = null, qty = 1) => {
    if (!name || !name.trim()) return get().currentItems;
    const mealId = await get().ensureMeal();
    insertMealItem(mealId, name.trim(), energy_kcal, qty, { manual: true });
    return await get().reloadItems();
  },

  removeItemById: async itemId => {
    deleteMealItem(itemId);
    return await get().reloadItems();
  },
}));

import { create } from 'zustand';
import { AnalyzeMealResponseData } from '../services/BackendApiService';
import { MealsRepository } from '../services/db/MealRepository';

type PerItemLike = {
  id?: string;
  name: string;
  energy_kcal?: number | null;
  source?: string;
};

type MealItem = {
  id: number;
  meal_id?: number;
  name: string;
  qty: number;
  energy_kcal: number | null;
  meta?: unknown;
};

type MealState = {
  lastAnalysis?: AnalyzeMealResponseData;
  setLastAnalysis: (d?: AnalyzeMealResponseData) => void;

  currentMealId: number | null;
  currentItems: MealItem[];

  ensureMeal: () => Promise<number>;
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
    let id = get().currentMealId;

    if (id == null) {
      id = await MealsRepository.ensureMealForToday();
      set({ currentMealId: id });
    }

    return id;
  },

  reloadItems: async () => {
    const id = get().currentMealId;
    if (id == null) {
      set({ currentItems: [] });
      return [];
    }
    const rows = await MealsRepository.listMealItems(id);
    const items: MealItem[] = rows.map(r => ({
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

    await MealsRepository.addMealItemsBulk(
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
    await MealsRepository.addMealItem(mealId, name.trim(), energy_kcal, qty, {
      manual: true,
    });
    return await get().reloadItems();
  },

  removeItemById: async itemId => {
    await MealsRepository.deleteMealItem(itemId);
    return await get().reloadItems();
  },
}));

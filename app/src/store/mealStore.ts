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
} from '../db/mealsDb';

/** Minimal shape of a single food item coming from analysis results */
type PerItemLike = {
  id?: string;
  name: string;
  energy_kcal?: number | null;
  source?: string;
  // Any extra fields from backend can be stored in meta
  [k: string]: any;
};

/** Store state and actions */
type MealState = {
  /** Your existing field: the latest full analysis payload */
  lastAnalysis?: AnalyzeResp;
  setLastAnalysis: (d?: AnalyzeResp) => void;

  /** The current meal id (null means no active meal yet) */
  currentMealId: number | null;

  /** Items that belong to the current meal (render in "This meal" list) */
  currentItems: Array<{
    id: number;
    meal_id?: number;
    name: string;
    qty: number;
    energy_kcal: number | null;
    meta?: any;
  }>;

  /** Ensure an active meal exists; create one if needed and return its id */
  ensureMeal: () => Promise<number>;

  /** Mark current meal as finished and clear in-memory list */
  finishMeal: () => Promise<void>;

  /** Re-query items of the current meal from SQLite and update state */
  reloadItems: () => Promise<void>;

  /** Append items parsed from analysis results into current meal */
  appendFromAnalysis: (perItems: PerItemLike[]) => Promise<void>;

  /** Manually add an item (for "+ Add item" flow) */
  addManualItem: (
    name: string,
    energy_kcal?: number | null,
    qty?: number
  ) => Promise<void>;

  /** Delete a single item by id */
  removeItemById: (itemId: number) => Promise<void>;
};

export const useMealStore = create<MealState>((set, get) => ({
  // ===== keep your original lastAnalysis behavior =====
  lastAnalysis: undefined,
  setLastAnalysis: d => set({ lastAnalysis: d }),

  // ===== new fields for the "current meal" feature =====
  currentMealId: null,
  currentItems: [],

  /** Create tables (idempotent), ensure an active meal exists, return its id */
  ensureMeal: async () => {
    // Safe to call many times; does nothing if tables already exist
    ensureMealsSchema();

    let id = get().currentMealId;
    if (id == null) {
      id = createMeal();
      set({ currentMealId: id });
    }
    return id;
  },

  /** Close the current meal and clear UI state */
  finishMeal: async () => {
    const id = get().currentMealId;
    if (id != null) {
      closeMeal(id);
    }
    set({ currentMealId: null, currentItems: [] });
  },

  /** Load items of the active meal from DB */
  reloadItems: async () => {
    const id = get().currentMealId;
    if (id == null) return;
    const rows = listMealItems(id);
    set({
      currentItems: rows.map((r: any) => ({
        id: r.id,
        meal_id: r.meal_id,
        name: r.name,
        qty: r.qty ?? 1, // default to 1 if your schema doesn't have qty
        energy_kcal: r.energy_kcal ?? null,
        meta: r.meta_json ? JSON.parse(r.meta_json) : undefined,
      })),
    });
  },

  /** Bulk-append items coming from analysis (supports "append" behavior) */
  appendFromAnalysis: async perItems => {
    if (!perItems || perItems.length === 0) return;

    const mealId = await get().ensureMeal();

    // Use bulk insert for better performance
    insertMealItemsBulk(
      mealId,
      perItems.map(p => ({
        name: p.name || p.id || 'Food',
        energy: p.energy_kcal ?? null,
        qty: 1,
        meta: p, // keep original fields for later use
      }))
    );

    await get().reloadItems();
  },

  /** Add a single item manually (name required, others optional) */
  addManualItem: async (name, energy_kcal = null, qty = 1) => {
    if (!name || !name.trim()) return;
    const mealId = await get().ensureMeal();
    insertMealItem(mealId, name.trim(), energy_kcal, qty, { manual: true });
    await get().reloadItems();
  },

  /** Delete an item and refresh the list */
  removeItemById: async itemId => {
    deleteMealItem(itemId);
    await get().reloadItems();
  },
}));

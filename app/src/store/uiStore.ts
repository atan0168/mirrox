import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localStorageService } from '../services/LocalStorageService';
import { UI_PERSIST_KEY } from '../constants';

type UIState = {
  dashboardOnboardingSeen: boolean;
  markDashboardOnboardingSeen: () => void;
  resetDashboardOnboarding: () => void;
};

// Persist UI state using our encrypted LocalStorageService as storage backend
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      dashboardOnboardingSeen: false,
      markDashboardOnboardingSeen: () => set({ dashboardOnboardingSeen: true }),
      resetDashboardOnboarding: () => set({ dashboardOnboardingSeen: false }),
    }),
    {
      name: UI_PERSIST_KEY,
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await localStorageService.getString(name);
        },
        setItem: async (name: string, value: string) => {
          await localStorageService.setString(name, value);
        },
        removeItem: async (name: string) => {
          await localStorageService.remove(name);
        },
      })),
      partialize: state => ({
        dashboardOnboardingSeen: state.dashboardOnboardingSeen,
      }),
    }
  )
);

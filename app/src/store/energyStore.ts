import { create } from 'zustand';

interface EnergyState {
  energyPct: number | null;
  currentDay: string;
  setEnergyPct: (v: number | null) => void;
  setCurrentDay: (k: string) => void;
}

export const useEnergyStore = create<EnergyState>(set => ({
  energyPct: null,
  currentDay: new Date().toDateString(),
  setEnergyPct: (v) => set({ energyPct: v }),
  setCurrentDay: (k) => set({ currentDay: k }),
}));


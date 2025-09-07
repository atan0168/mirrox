import { create } from 'zustand';
import { HomeTimeOfDay } from '../components/scene/SceneHome';

export type HomeSceneTimeOfDay = HomeTimeOfDay; // re-export for clarity

interface HomeSceneState {
  timeOfDay: HomeSceneTimeOfDay; // logical interior time
  lampOn: boolean;
  kettleActive: boolean;
  // Derived convenience flags (can be extended later)
  setTimeOfDay: (t: HomeSceneTimeOfDay) => void;
  toggleLamp: () => void;
  toggleKettle: () => void;
  setLampOn: (on: boolean) => void;
  setKettleActive: (active: boolean) => void;
  reset: () => void;
}

const initialState: Pick<
  HomeSceneState,
  'timeOfDay' | 'lampOn' | 'kettleActive'
> = {
  timeOfDay: 'morning',
  lampOn: false,
  kettleActive: true,
};

export const useHomeSceneStore = create<HomeSceneState>(set => ({
  ...initialState,
  setTimeOfDay: t => set({ timeOfDay: t }),
  toggleLamp: () => set(s => ({ lampOn: !s.lampOn })),
  toggleKettle: () => set(s => ({ kettleActive: !s.kettleActive })),
  setLampOn: on => set({ lampOn: on }),
  setKettleActive: active => set({ kettleActive: active }),
  reset: () => set({ ...initialState }),
}));

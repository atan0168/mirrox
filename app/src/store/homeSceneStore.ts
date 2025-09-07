import { create } from 'zustand';
import { HomeTimeOfDay } from '../components/scene/SceneHome';

export type HomeSceneTimeOfDay = HomeTimeOfDay; // re-export for clarity

interface HomeSceneState {
  timeOfDay: HomeSceneTimeOfDay; // logical interior time
  windowOpen: boolean;
  lampOn: boolean;
  kettleActive: boolean;
  // Derived convenience flags (can be extended later)
  setTimeOfDay: (t: HomeSceneTimeOfDay) => void;
  toggleWindow: () => void;
  toggleLamp: () => void;
  toggleKettle: () => void;
  setWindowOpen: (open: boolean) => void;
  setLampOn: (on: boolean) => void;
  setKettleActive: (active: boolean) => void;
  reset: () => void;
}

const initialState: Pick<
  HomeSceneState,
  'timeOfDay' | 'windowOpen' | 'lampOn' | 'kettleActive'
> = {
  timeOfDay: 'morning',
  windowOpen: true,
  lampOn: false,
  kettleActive: true,
};

export const useHomeSceneStore = create<HomeSceneState>((set, get) => ({
  ...initialState,
  setTimeOfDay: t => set({ timeOfDay: t }),
  toggleWindow: () => set(s => ({ windowOpen: !s.windowOpen })),
  toggleLamp: () => set(s => ({ lampOn: !s.lampOn })),
  toggleKettle: () => set(s => ({ kettleActive: !s.kettleActive })),
  setWindowOpen: open => set({ windowOpen: open }),
  setLampOn: on => set({ lampOn: on }),
  setKettleActive: active => set({ kettleActive: active }),
  reset: () => set({ ...initialState }),
}));

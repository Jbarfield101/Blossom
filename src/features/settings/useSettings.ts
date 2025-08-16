import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ModuleKey =
  | 'objects'
  | 'music'
  | 'calendar'
  | 'comfy'
  | 'assistant'
  | 'laser'
  | 'dnd';

type ModulesState = Record<ModuleKey, boolean>;

interface SettingsState {
  modules: ModulesState;
  toggleModule: (key: ModuleKey) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      modules: {
        objects: true,
        music: true,
        calendar: true,
        comfy: true,
        assistant: true,
        laser: true,
        dnd: true,
      },
      toggleModule: (key) =>
        set((state) => ({
          modules: { ...state.modules, [key]: !state.modules[key] },
        })),
    }),
    { name: 'settings-store' }
  )
);

export type { ModuleKey };

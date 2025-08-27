import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '../theme/ThemeContext';

type ModuleKey =
  | 'objects'
  | 'music'
  | 'calendar'
  | 'comfy'
  | 'assistant'
  | 'laser'
  | 'fusion'
  | 'simulation'
  | 'dnd'
  | 'voices'
  | 'stocks'
  | 'shorts'
  | 'chores'
  | 'construction';

type ModulesState = Record<ModuleKey, boolean>;

const defaultModules: ModulesState = {
  objects: true,
  music: true,
  calendar: true,
  comfy: true,
  assistant: true,
  laser: true,
  fusion: true,
  simulation: true,
  dnd: true,
  voices: true,
  stocks: true,
  shorts: true,
  chores: true,
  construction: true,
};

interface User {
  id: string;
  name: string;
  theme: Theme;
  money: number;
  modules: ModulesState;
  cpuLimit: number;
  memLimit: number;
  retroTvMedia: string | null;
}

interface UsersState {
  users: Record<string, User>;
  currentUserId: string | null;
  globalTheme: Theme;
  addUser: (name: string) => void;
  switchUser: (id: string) => void;
  setTheme: (theme: Theme) => void;
  toggleModule: (key: ModuleKey) => void;
  setCpuLimit: (limit: number) => void;
  setMemLimit: (limit: number) => void;
  setRetroTvMedia: (dataUrl: string | null) => void;
}

export const useUsers = create<UsersState>()(
  persist(
    (set, get) => ({
      users: {},
      currentUserId: null,
      globalTheme: 'default',
      addUser: (name) => {
        const id = Date.now().toString();
        set((state) => ({
          users: {
            ...state.users,
            [id]: {
              id,
              name,
              theme: state.globalTheme,
              money: 5000,
              modules: { ...defaultModules },
              cpuLimit: 90,
              memLimit: 90,
              retroTvMedia: null,
            },
          },
          currentUserId: id,
        }));
      },
      switchUser: (id) => set(() => ({ currentUserId: id })),
      setTheme: (theme) => {
        const id = get().currentUserId;
        if (!id) {
          set({ globalTheme: theme });
          return;
        }
        set((state) => ({
          users: {
            ...state.users,
            [id]: { ...state.users[id], theme },
          },
        }));
      },
        toggleModule: (key) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => {
            const user = state.users[id];
            return {
              users: {
                ...state.users,
                [id]: {
                  ...user,
                  modules: { ...user.modules, [key]: !user.modules[key] },
                },
              },
            };
          });
        },
        setCpuLimit: (limit) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => ({
            users: {
              ...state.users,
              [id]: { ...state.users[id], cpuLimit: limit },
            },
          }));
        },
        setMemLimit: (limit) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => ({
            users: {
              ...state.users,
              [id]: { ...state.users[id], memLimit: limit },
            },
          }));
        },
        setRetroTvMedia: (dataUrl) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => ({
            users: {
              ...state.users,
              [id]: { ...state.users[id], retroTvMedia: dataUrl },
            },
          }));
        },
      }),
      { name: 'user-store' }
    )
  );

export const setRetroTvMedia = (dataUrl: string | null) =>
  useUsers.getState().setRetroTvMedia(dataUrl);

export { type ModuleKey, type ModulesState, defaultModules };

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
  | 'dnd'
  | 'stocks';

type ModulesState = Record<ModuleKey, boolean>;

const defaultModules: ModulesState = {
  objects: true,
  music: true,
  calendar: true,
  comfy: true,
  assistant: true,
  laser: true,
  dnd: true,
  stocks: true,
};

interface User {
  id: string;
  name: string;
  theme: Theme;
  modules: ModulesState;
}

interface UsersState {
  users: Record<string, User>;
  currentUserId: string | null;
  addUser: (name: string) => void;
  switchUser: (id: string) => void;
  setTheme: (theme: Theme) => void;
  toggleModule: (key: ModuleKey) => void;
}

export const useUsers = create<UsersState>()(
  persist(
    (set, get) => ({
      users: {},
      currentUserId: null,
      addUser: (name) => {
        const id = Date.now().toString();
        set((state) => ({
          users: {
            ...state.users,
            [id]: { id, name, theme: 'default', modules: { ...defaultModules } },
          },
          currentUserId: id,
        }));
      },
      switchUser: (id) => set(() => ({ currentUserId: id })),
      setTheme: (theme) => {
        const id = get().currentUserId;
        if (!id) return;
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
    }),
    { name: 'user-store' }
  )
);

export { type ModuleKey, type ModulesState, defaultModules };

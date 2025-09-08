import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '../theme/ThemeContext';

type ModuleKey =
  | 'objects'
  | 'music'
  | 'aimusic'
  | 'calendar'
  | 'comfy'
  | 'assistant'
  | 'laser'
  | 'fusion'
  | 'simulation'
  | 'dnd'
  | 'voices'
  | 'shorts'
  | 'chores'
  | 'construction'
  | 'video'
  | 'sfz';

type ModulesState = Record<ModuleKey, boolean>;

const defaultModules: ModulesState = {
  objects: true,
  music: true,
  aimusic: true,
  calendar: true,
  comfy: true,
  assistant: true,
  laser: true,
  fusion: true,
  simulation: true,
  dnd: true,
  voices: true,
  shorts: true,
  chores: true,
  construction: true,
  video: true,
  sfz: true,
};

type WidgetKey = 'homeChat' | 'systemInfo' | 'tasks';
type WidgetsState = Record<WidgetKey, boolean>;

const defaultWidgets: WidgetsState = {
  homeChat: false,
  systemInfo: false,
  tasks: false,
};

interface RetroTvMedia {
  path: string;
  width: number;
  height: number;
}

interface User {
  id: string;
  name: string;
  theme: Theme;
  money: number;
  modules: ModulesState;
  widgets: WidgetsState;
  cpuLimit: number;
  memLimit: number;
  retroTvMedia: RetroTvMedia | null;
}

interface UsersState {
  users: Record<string, User>;
  currentUserId: string | null;
  globalTheme: Theme;
  addUser: (name: string) => void;
  switchUser: (id: string) => void;
  setTheme: (theme: Theme) => void;
  toggleModule: (key: ModuleKey) => void;
  toggleWidget: (key: WidgetKey) => void;
  setCpuLimit: (limit: number) => void;
  setMemLimit: (limit: number) => void;
  setRetroTvMedia: (media: RetroTvMedia) => void;
  clearRetroTvMedia: () => void;
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
              widgets: { ...defaultWidgets },
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
        toggleWidget: (key) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => {
            const user = state.users[id];
            return {
              users: {
                ...state.users,
                [id]: {
                  ...user,
                  widgets: { ...user.widgets, [key]: !user.widgets[key] },
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
        setRetroTvMedia: (media) => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => ({
            users: {
              ...state.users,
              [id]: { ...state.users[id], retroTvMedia: media },
            },
          }));
        },
        clearRetroTvMedia: () => {
          const id = get().currentUserId;
          if (!id) return;
          set((state) => ({
            users: {
              ...state.users,
              [id]: { ...state.users[id], retroTvMedia: null },
            },
          }));
        },
      }),
      { name: 'user-store' }
    )
  );

useUsers.persist.onFinishHydration((state) => {
  const id = state.currentUserId;
  if (id && !state.users[id]) {
    useUsers.setState({ currentUserId: null });
  }
});

export {
  type ModuleKey,
  type ModulesState,
  defaultModules,
  type WidgetKey,
  type WidgetsState,
  defaultWidgets,
  type RetroTvMedia,
};

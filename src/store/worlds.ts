import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorldState {
  worlds: string[];
  currentWorld: string;
  addWorld: (world: string) => void;
  removeWorld: (world: string) => void;
  setCurrentWorld: (world: string) => void;
}

export const useWorlds = create<WorldState>()(
  persist(
    (set) => ({
      worlds: [],
      currentWorld: '',
      addWorld: (world) =>
        set((state) => {
          const name = world.trim();
          if (
            !name ||
            state.worlds.some((w) => w.toLowerCase() === name.toLowerCase())
          )
            return state;
          return { worlds: [...state.worlds, name] };
        }),
      removeWorld: (world) =>
        set((state) => ({
          worlds: state.worlds.filter((w) => w !== world),
        })),
      setCurrentWorld: (world) => set({ currentWorld: world }),
    }),
    { name: 'world-store' }
  )
);

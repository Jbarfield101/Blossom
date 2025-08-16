import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorldState {
  worlds: string[];
  addWorld: (world: string) => void;
}

export const useWorlds = create<WorldState>()(
  persist(
    (set) => ({
      worlds: [],
      addWorld: (world) =>
        set((state) => ({ worlds: [...state.worlds, world] })),
    }),
    { name: 'world-store' }
  )
);

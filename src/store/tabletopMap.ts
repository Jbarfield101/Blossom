import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TabletopMapState {
  showGrid: boolean;
  gridSize: number;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
}

export const useTabletopMap = create<TabletopMapState>()(
  persist(
    (set) => ({
      showGrid: true,
      gridSize: 50,
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setGridSize: (size) => set({ gridSize: size }),
    }),
    { name: 'tabletop-map' }
  )
);

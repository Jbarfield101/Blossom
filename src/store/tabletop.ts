import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TabletopState {
  gridSize: number;
  gridColor: string;
  showGrid: boolean;
  setGridSize: (size: number) => void;
  setGridColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
}

export const useTabletopStore = create<TabletopState>()(
  persist(
    (set) => ({
      gridSize: 50,
      gridColor: '#000000',
      showGrid: true,
      setGridSize: (gridSize) => set({ gridSize }),
      setGridColor: (gridColor) => set({ gridColor }),
      setShowGrid: (showGrid) => set({ showGrid }),
    }),
    { name: 'tabletop-store' }
  )
);

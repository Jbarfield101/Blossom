import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OutputState {
  folder: string;
  setFolder: (path: string) => void;
}

export const useOutput = create<OutputState>()(
  persist(
    (set) => ({
      folder: '',
      setFolder: (path: string) => set({ folder: path })
    }),
    { name: 'output-store' }
  )
);

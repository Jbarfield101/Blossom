import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ComfyState {
  folder: string;
  setFolder: (path: string) => void;
}

export const useComfy = create<ComfyState>()(
  persist(
    (set) => ({
      folder: '',
      setFolder: (path: string) => set({ folder: path })
    }),
    { name: 'comfy-store' }
  )
);

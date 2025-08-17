import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface NPC {
  name: string;
  race: string;
  class: string;
  personality: string;
  background: string;
  appearance: string;
}

interface NPCState {
  npcs: NPC[];
  addNPC: (npc: NPC) => void;
  removeNPC: (index: number) => void;
  loadNPCs: () => Promise<void>;
}

export const useNPCs = create<NPCState>()(
  persist(
    (set) => ({
      npcs: [],
      addNPC: (npc) => set((state) => ({ npcs: [...state.npcs, npc] })),
      removeNPC: (index) =>
        set((state) => ({ npcs: state.npcs.filter((_, i) => i !== index) })),
      loadNPCs: async () => {
        try {
          const saved: NPC[] = await invoke('list_npcs');
          set((state) => ({ npcs: [...state.npcs, ...saved] }));
        } catch (e) {
          console.error(e);
        }
      },
    }),
    { name: 'npc-store' }
  )
);

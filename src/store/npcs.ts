import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface NPC {
  id: string;
  name: string;
  race: string;
  class: string;
  role?: string;
  cr?: number;
  locale?: string;
  tags?: string[];
  personality: string;
  background: string;
  appearance: string;
  portrait?: string;
  hooks?: string[];
  quirks?: string[];
  secrets?: string[];
  stats?: Record<string, string | number>;
  skills?: Record<string, string | number>;
}

interface NPCState {
  npcs: NPC[];
  addNPC: (npc: Omit<NPC, 'id'>) => void;
  removeNPC: (id: string) => void;
  loadNPCs: () => Promise<void>;
}

export const useNPCs = create<NPCState>()(
  persist(
    (set) => ({
      npcs: [],
      addNPC: (npc) =>
        set((state) => ({
          npcs: [...state.npcs, { id: crypto.randomUUID(), ...npc }],
        })),
      removeNPC: (id) =>
        set((state) => ({ npcs: state.npcs.filter((npc) => npc.id !== id) })),
      loadNPCs: async () => {
        const npcs = await invoke<NPC[]>('list_npcs');
        set({ npcs });
      },
    }),
    { name: 'npc-store' }
  )
);

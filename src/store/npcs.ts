import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Npc } from '../dnd/schemas/npc';

interface NpcState {
  npcs: Npc[];
  addNPC: (npc: Omit<Npc, 'id'>) => void;
  removeNPC: (id: string) => void;
  loadNPCs: () => Promise<void>;
}

export const useNPCs = create<NpcState>()(
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
        const npcs = await invoke<Npc[]>('list_npcs');
        set({ npcs });
      },
    }),
    { name: 'npc-store' }
  )
);

export type { Npc };

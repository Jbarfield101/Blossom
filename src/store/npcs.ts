import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Npc } from '../dnd/schemas/npc';
import { useInventory } from './inventory';

interface NpcState {
  npcs: Npc[];
  addNPC: (npc: Omit<Npc, 'id'> & { id?: string }) => void;
  removeNPC: (id: string) => void;
  loadNPCs: (world: string) => Promise<void>;
}

export const useNPCs = create<NpcState>()(
  persist(
    (set) => ({
      npcs: [],
      addNPC: (npc) =>
        set((state) => {
          const withId: Npc = { id: npc.id ?? crypto.randomUUID(), ...npc } as Npc;
          const npcs = state.npcs.some((n) => n.id === withId.id)
            ? state.npcs.map((n) => (n.id === withId.id ? withId : n))
            : [...state.npcs, withId];
          useInventory.getState().scanNPCs(npcs);
          return { npcs };
        }),
      removeNPC: (id) =>
        set((state) => {
          const npcs = state.npcs.filter((npc) => npc.id !== id);
          useInventory.getState().scanNPCs(npcs);
          return { npcs };
        }),
      loadNPCs: async (world: string) => {
        const npcs = await invoke<Npc[]>('list_npcs', { world });
        set({ npcs });
        useInventory.getState().scanNPCs(npcs);
      },
    }),
    { name: 'npc-store' }
  )
);

export type { Npc };

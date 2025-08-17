import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NPC {
  id: string;
  name: string;
  race: string;
  class: string;
  personality: string;
  background: string;
  appearance: string;
}

interface NPCState {
  npcs: NPC[];
  addNPC: (npc: Omit<NPC, 'id'>) => void;
  removeNPC: (id: string) => void;
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
    }),
    { name: 'npc-store' }
  )
);

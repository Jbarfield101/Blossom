import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { SpellData } from '../features/dnd/types';

interface SpellState {
  spells: SpellData[];
  loadSpells: () => Promise<void>;
  addSpell: (spell: Omit<SpellData, 'id'> & { id?: string }) => Promise<void>;
  removeSpell: (id: string) => void;
}

export const useSpells = create<SpellState>()(
  persist(
    (set) => ({
      spells: [],
      loadSpells: async () => {
        const spells = await invoke<SpellData[]>('list_spells');
        set({ spells });
      },
      addSpell: async (spell) => {
        const withId: SpellData = { id: spell.id ?? crypto.randomUUID(), ...spell } as SpellData;
        await invoke('save_spell', { spell: withId });
        set((state) => {
          const exists = state.spells.some((s) => s.id === withId.id);
          const spells = exists
            ? state.spells.map((s) => (s.id === withId.id ? withId : s))
            : [...state.spells, withId];
          return { spells };
        });
      },
      removeSpell: (id) =>
        set((state) => ({ spells: state.spells.filter((s) => s.id !== id) })),
    }),
    { name: 'spell-store' }
  )
);

export type { SpellData as Spell };

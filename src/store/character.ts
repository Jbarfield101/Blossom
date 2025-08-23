import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character } from '../dnd/characters';
import { useNPCs } from './npcs';

interface CharacterState {
  character: Character | null;
  setCharacter: (char: Character) => void;
  clearCharacter: () => void;
}

export const useCharacter = create<CharacterState>()(
  persist(
    (set) => ({
      character: null,
      setCharacter: (char) => {
        set({ character: char });
        const addNPC = useNPCs.getState().addNPC;
        addNPC({
          name: 'Player Character',
          race: 'Unknown',
          class: char.class,
          personality: '',
          background: '',
          appearance: '',
          portrait: 'placeholder.png',
          icon: 'placeholder-icon.png',
          playerCharacter: true,
          hooks: [],
          stats: char.abilities,
          sections: {},
          tags: ['player'],
          abilities: char.abilities,
          level: char.level,
          hp: char.hp,
          inventory: char.inventory,
        });
      },
      clearCharacter: () => set({ character: null }),
    }),
    { name: 'character-store' }
  )
);


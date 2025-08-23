import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Encounter, Participant } from '../dnd/encounters';

interface EncounterState {
  encounter: Encounter | null;
  startEncounter: (participants: Participant[]) => void;
  nextTurn: () => void;
  endEncounter: () => void;
}

export const useEncounterStore = create<EncounterState>()(
  persist(
    (set) => ({
      encounter: null,
      startEncounter: (participants) =>
        set({ encounter: new Encounter(participants) }),
      nextTurn: () =>
        set((state) =>
          state.encounter ? { encounter: state.encounter.advance() } : state
        ),
      endEncounter: () => set({ encounter: null }),
    }),
    { name: 'encounter-store' }
  )
);

export type { EncounterState };

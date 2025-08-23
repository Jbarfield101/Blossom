import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Encounter, { EncounterParticipant } from '../dnd/encounters/Encounter';

interface EncounterState {
  encounter: Encounter | null;
  startEncounter: (participants: EncounterParticipant[]) => void;
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
        set((state) => {
          state.encounter?.next();
          return { encounter: state.encounter };
        }),
      endEncounter: () => set({ encounter: null }),
    }),
    { name: 'encounter-store' }
  )
);

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
    {
      name: 'encounter-store',
      serialize: (state) =>
        JSON.stringify({
          state: {
            ...state.state,
            encounter: state.state.encounter
              ? {
                  participants: state.state.encounter.participants,
                  current: state.state.encounter.current,
                }
              : null,
          },
          version: state.version,
        }),
      deserialize: (str) => {
        const parsed = JSON.parse(str) as {
          state: {
            encounter: { participants: Participant[]; current: number } | null;
          };
          version: number;
        };
        return {
          state: {
            ...parsed.state,
            encounter: parsed.state.encounter
              ? new Encounter(
                  parsed.state.encounter.participants,
                  parsed.state.encounter.current,
                  true,
                )
              : null,
          },
          version: parsed.version,
        };
      },
    }
  )
);

export type { EncounterState };

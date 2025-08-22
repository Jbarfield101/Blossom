import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Marker {
  id: string;
  x: number;
  y: number;
  note: string;
}

interface WarTableState {
  mapImage: string | null;
  partyPosition: { x: number; y: number } | null;
  markers: Marker[];
  setMapImage: (img: string | null) => void;
  setPartyPosition: (pos: { x: number; y: number } | null) => void;
  addMarker: (marker: Omit<Marker, 'id'>) => void;
  removeMarker: (id: string) => void;
}

export const useWarTableStore = create<WarTableState>()(
  persist(
    (set) => ({
      mapImage: null,
      partyPosition: null,
      markers: [],
      setMapImage: (mapImage) => set({ mapImage }),
      setPartyPosition: (partyPosition) => set({ partyPosition }),
      addMarker: (marker) =>
        set((state) => ({
          markers: [...state.markers, { id: crypto.randomUUID(), ...marker }],
        })),
      removeMarker: (id) =>
        set((state) => ({
          markers: state.markers.filter((m) => m.id !== id),
        })),
    }),
    { name: 'war-table-store' }
  )
);

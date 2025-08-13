import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent, CalendarState } from './types';

interface Actions {
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  setSelectedCountdownId: (id: string | null) => void;
}

export const useCalendar = create<CalendarState & Actions>()(
  persist(
    (set) => ({
      events: [],
      selectedCountdownId: null,
      addEvent: (e) =>
        set((state) => ({
          events: [...state.events, { id: crypto.randomUUID(), ...e }],
        })),
      updateEvent: (id, patch) =>
        set((state) => ({
          events: state.events.map((ev) =>
            ev.id === id ? { ...ev, ...patch } : ev
          ),
        })),
      removeEvent: (id) =>
        set((state) => ({
          events: state.events.filter((ev) => ev.id !== id),
        })),
      setSelectedCountdownId: (id) => set({ selectedCountdownId: id }),
    }),
    { name: 'calendar-store' }
  )
);

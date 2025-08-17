import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent, CalendarState } from './types';
import { recalcTagTotals } from './recalcTagTotals';

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
      tagTotals: {},
      addEvent: (e) => {
        if (!e.title || !e.date || !e.end) return;
        const start = Date.parse(e.date);
        const end = Date.parse(e.end);
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;
        set((state) => {
          const newEvent = { id: crypto.randomUUID(), ...e };
          const events = [...state.events, newEvent].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const tagTotals = { ...state.tagTotals };
          const contrib = recalcTagTotals([newEvent]);
          for (const [tag, ms] of Object.entries(contrib)) {
            tagTotals[tag] = (tagTotals[tag] || 0) + ms;
          }
          return { events, tagTotals };
        });
      },
      updateEvent: (id, patch) =>
        set((state) => {
          const ev = state.events.find((e) => e.id === id);
          if (!ev) return state;
          const next = { ...ev, ...patch };
          if (!next.title || !next.date || !next.end) return state;
          const start = Date.parse(next.date);
          const end = Date.parse(next.end);
          if (Number.isNaN(start) || Number.isNaN(end) || end <= start)
            return state;
          const events = state.events
            .map((e) => (e.id === id ? next : e))
            .sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          const tagTotals = { ...state.tagTotals };
          const prevContrib = recalcTagTotals([ev]);
          for (const [tag, ms] of Object.entries(prevContrib)) {
            tagTotals[tag] = (tagTotals[tag] || 0) - ms;
            if (tagTotals[tag] <= 0) delete tagTotals[tag];
          }
          const nextContrib = recalcTagTotals([next]);
          for (const [tag, ms] of Object.entries(nextContrib)) {
            tagTotals[tag] = (tagTotals[tag] || 0) + ms;
          }
          return { events, tagTotals };
        }),
      removeEvent: (id) =>
        set((state) => {
          const ev = state.events.find((e) => e.id === id);
          if (!ev) return state;
          const events = state.events.filter((e) => e.id !== id);
          const tagTotals = { ...state.tagTotals };
          const contrib = recalcTagTotals([ev]);
          for (const [tag, ms] of Object.entries(contrib)) {
            tagTotals[tag] = (tagTotals[tag] || 0) - ms;
            if (tagTotals[tag] <= 0) delete tagTotals[tag];
          }
          return { events, tagTotals };
        }),
      setSelectedCountdownId: (id) => set({ selectedCountdownId: id }),
    }),
    { name: 'calendar-store' }
  )
);

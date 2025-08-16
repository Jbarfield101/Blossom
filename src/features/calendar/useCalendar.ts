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
    (set) => {
      const recalc = (events: CalendarEvent[]) => {
        const totals: Record<string, number> = {};
        for (const ev of events) {
          const status = ev.status ?? 'scheduled';
          if (status === 'canceled' || status === 'missed') continue;
          if (!ev.end) continue;
          const duration =
            new Date(ev.end).getTime() - new Date(ev.date).getTime();
          if (duration <= 0) continue;
          (ev.tags ?? []).forEach((t) => {
            totals[t] = (totals[t] || 0) + duration;
          });
        }
        return totals;
      };

      return {
        events: [],
        selectedCountdownId: null,
        tagTotals: {},
        addEvent: (e) => {
          const start = new Date(e.date).getTime();
          const end = new Date(e.end).getTime();
          if (end <= start) return;
          set((state) => {
            const events = [...state.events, { id: crypto.randomUUID(), ...e }];
            return { events, tagTotals: recalc(events) };
          });
        },
        updateEvent: (id, patch) =>
          set((state) => {
            const ev = state.events.find((e) => e.id === id);
            if (!ev) return state;
            if (patch.end !== undefined) {
              const start = new Date(patch.date ?? ev.date).getTime();
              const end = new Date(patch.end).getTime();
              if (end <= start) return state;
            }
            const events = state.events.map((e) =>
              e.id === id ? { ...e, ...patch } : e
            );
            return { events, tagTotals: recalc(events) };
          }),
        removeEvent: (id) =>
          set((state) => {
            const events = state.events.filter((ev) => ev.id !== id);
            return { events, tagTotals: recalc(events) };
          }),
        setSelectedCountdownId: (id) => set({ selectedCountdownId: id }),
      };
    },
    { name: 'calendar-store' }
  )
);

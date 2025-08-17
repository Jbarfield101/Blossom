import type { CalendarEvent } from './types';

export function recalcTagTotals(events: CalendarEvent[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const ev of events) {
    const status = ev.status ?? 'scheduled';
    if (status === 'canceled' || status === 'missed') continue;
    if (!ev.end) continue;
    const duration = new Date(ev.end).getTime() - new Date(ev.date).getTime();
    if (duration <= 0) continue;
    (ev.tags ?? []).forEach((t) => {
      totals[t] = (totals[t] || 0) + duration;
    });
  }
  return totals;
}

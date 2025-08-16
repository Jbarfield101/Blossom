import type { CalendarEvent } from './types';

export const statusColors: Record<CalendarEvent['status'], string> = {
  scheduled: 'bg-blue-500',
  canceled: 'bg-red-500',
  missed: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

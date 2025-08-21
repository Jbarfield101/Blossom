import type { CalendarEvent } from './types';
import { colors } from '../../theme';

export const statusColors: Record<CalendarEvent['status'], string> = {
  scheduled: colors.status.scheduled,
  canceled: colors.status.canceled,
  missed: colors.status.missed,
  completed: colors.status.completed,
};

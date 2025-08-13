export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  hasCountdown: boolean;
}

export interface CalendarState {
  events: CalendarEvent[];
  selectedCountdownId: string | null;
}

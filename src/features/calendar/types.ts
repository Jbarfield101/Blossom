export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // start ISO string
  end: string; // end ISO string
  tags: string[];
  status: 'scheduled' | 'canceled' | 'missed' | 'completed';
  hasCountdown: boolean;
}

export interface CalendarState {
  events: CalendarEvent[];
  selectedCountdownId: string | null;
  tagTotals: Record<string, number>;
}

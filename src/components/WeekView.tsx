import type { CalendarEvent } from "../features/calendar/types";

interface Props {
  current: Date;
  events: CalendarEvent[];
}

export default function WeekView({ current, events }: Props) {
  const start = new Date(current);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const weekEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d < end;
  });

  return (
    <div data-testid="week-view">
      {weekEvents.length === 0 ? (
        <div className="text-sm text-gray-500">No events this week</div>
      ) : (
        <ul className="space-y-1">
          {weekEvents.map((ev) => (
            <li key={ev.id} className="text-sm">
              {ev.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


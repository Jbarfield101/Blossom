import type { CalendarEvent } from "../features/calendar/types";

interface Props {
  events: CalendarEvent[];
}

export default function AgendaView({ events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div data-testid="agenda-view">
      {sorted.length === 0 ? (
        <div className="text-sm text-gray-500">No events</div>
      ) : (
        <ul className="space-y-1">
          {sorted.map((ev) => {
            const start = new Date(ev.date);
            const end = new Date(ev.end);
            const dateStr = start.toLocaleDateString("en-US");
            const startStr = start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            const endStr = end.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <li key={ev.id} className="text-sm">
                {`${dateStr} ${startStr} - ${endStr} ${ev.title}`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


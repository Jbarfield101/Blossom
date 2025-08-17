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

  const grouped: Record<number, CalendarEvent[]> = {};
  weekEvents.forEach((ev) => {
    const day = new Date(ev.date).getDay();
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  });

  return (
    <div data-testid="week-view">
      {weekEvents.length === 0 ? (
        <div className="text-sm text-gray-500">No events this week</div>
      ) : (
        Object.keys(grouped)
          .sort((a, b) => Number(a) - Number(b))
          .map((day) => {
            const dayEvents = grouped[Number(day)].sort(
              (a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const dayDate = new Date(start);
            dayDate.setDate(start.getDate() + Number(day));
            const dayName = dayDate.toLocaleDateString("en-US", {
              weekday: "long",
            });
            return (
              <div key={day} className="mb-2">
                <div className="font-medium">{dayName}</div>
                <ul className="space-y-1">
                  {dayEvents.map((ev) => {
                    const startStr = new Date(ev.date).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" }
                    );
                    const endStr = new Date(ev.end).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" }
                    );
                    return (
                      <li key={ev.id} className="text-sm">
                        {`${startStr} - ${endStr} ${ev.title}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
      )}
    </div>
  );
}


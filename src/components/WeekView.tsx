import { Box, List, ListItem, Typography } from '@mui/material';
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
    const eventStart = new Date(e.date);
    const eventEnd = new Date(e.end);
    return eventStart < end && eventEnd > start;
  });

  const grouped: Record<number, CalendarEvent[]> = {};
  weekEvents.forEach((ev) => {
    const eventStart = new Date(ev.date);
    const eventEnd = new Date(ev.end);
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + d);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      if (eventStart < dayEnd && eventEnd > dayStart) {
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(ev);
      }
    }
  });

  return (
    <Box data-testid="week-view">
      {weekEvents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events this week
        </Typography>
      ) : (
        Object.keys(grouped)
          .sort((a, b) => Number(a) - Number(b))
          .map((day) => {
            const dayStart = new Date(start);
            dayStart.setDate(start.getDate() + Number(day));
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);
            const dayEvents = grouped[Number(day)].sort((a, b) => {
              const aStart = Math.max(
                new Date(a.date).getTime(),
                dayStart.getTime()
              );
              const bStart = Math.max(
                new Date(b.date).getTime(),
                dayStart.getTime()
              );
              return aStart - bStart;
            });
            const dayName = dayStart.toLocaleDateString("en-US", {
              weekday: "long",
            });
            return (
              <Box key={day} sx={{ mb: 2 }}>
                <Typography fontWeight={500}>{dayName}</Typography>
                <List dense sx={{ p: 0 }}>
                  {dayEvents.map((ev) => {
                    const evStart = new Date(ev.date).getTime();
                    const evEnd = new Date(ev.end).getTime();
                    const displayStart = new Date(
                      Math.max(evStart, dayStart.getTime())
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const displayEnd = new Date(
                      Math.min(evEnd, dayEnd.getTime())
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <ListItem key={ev.id} sx={{ py: 0 }}>
                        <Typography variant="body2">{`${displayStart} - ${displayEnd} ${ev.title}`}</Typography>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            );
          })
      )}
    </Box>
  );
}

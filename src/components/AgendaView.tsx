import { Box, List, ListItem, Typography } from '@mui/material';
import type { CalendarEvent } from "../features/calendar/types";

interface Props {
  events: CalendarEvent[];
}

export default function AgendaView({ events }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Box data-testid="agenda-view">
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events
        </Typography>
      ) : (
        <List dense sx={{ p: 0 }}>
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
              <ListItem key={ev.id} sx={{ py: 0 }}>
                <Typography variant="body2">{`${dateStr} ${startStr} - ${endStr} ${ev.title}`}</Typography>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}

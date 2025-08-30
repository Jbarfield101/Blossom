import { useState, useMemo } from "react";
import { Box, Button, ButtonGroup, List, ListItem, Typography } from "@mui/material";
import { useCalendar } from "../features/calendar/useCalendar";

export default function TasksWidget() {
  const { events } = useCalendar();
  const [view, setView] = useState<"day" | "week" | "month">("day");

  const [rangeStart, rangeEnd] = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (view === "day") {
      end.setDate(start.getDate() + 1);
    } else if (view === "week") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 7);
    } else {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
    }
    return [start, end];
  }, [view]);

  const tasks = useMemo(() => {
    return events.filter((e) => {
      if (!e.tags.includes("task")) return false;
      const evStart = new Date(e.date).getTime();
      const evEnd = new Date(e.end).getTime();
      return evStart < rangeEnd.getTime() && evEnd > rangeStart.getTime();
    });
  }, [events, rangeStart, rangeEnd]);

  return (
    <Box
      sx={{
        backgroundColor: "rgba(255,255,255,0.22)",
        color: "#fff",
        px: 2,
        py: 1,
        borderRadius: "0.5rem",
        minWidth: "12rem",
      }}
    >
      <ButtonGroup size="small" sx={{ mb: 1 }}>
        {(["day", "week", "month"] as const).map((v) => (
          <Button
            key={v}
            variant={view === v ? "contained" : "outlined"}
            onClick={() => setView(v)}
            sx={{ textTransform: "capitalize" }}
          >
            {v}
          </Button>
        ))}
      </ButtonGroup>
      {tasks.length === 0 ? (
        <Typography variant="body2">
          {view === "day" ? "No tasks today!" : "No tasks"}
        </Typography>
      ) : (
        <List dense sx={{ p: 0 }}>
          {tasks.map((ev) => (
            <ListItem key={ev.id} sx={{ py: 0 }}>
              <Typography variant="body2">{ev.title}</Typography>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}


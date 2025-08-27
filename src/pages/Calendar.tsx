import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import CalendarDay from "../components/CalendarDay";
import TagStats from "../components/TagStats";
import WeekView from "../components/WeekView";
import AgendaView from "../components/AgendaView";
import { useCalendar } from "../features/calendar/useCalendar";
import { useStatusColors } from "../features/calendar/statusColors";
import type { CalendarEvent } from "../features/calendar/types";
import { toLocalNaive } from "../utils/time";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [quickAdd, setQuickAdd] = useState<{
    day: number;
    top: number;
    left: number;
  } | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTime, setQuickTime] = useState("09:00");
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickTags, setQuickTags] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const quickTitleRef = useRef<HTMLInputElement>(null);
  const lastFocusedDayRef = useRef<HTMLDivElement | null>(null);
  const closeQuickAdd = useCallback(() => {
    setQuickAdd(null);
    setEditingEvent(null);
    setQuickTitle("");
    setQuickTime("09:00");
    setQuickDuration(60);
    setQuickTags("");
    lastFocusedDayRef.current?.focus();
  }, []);

  const events = useCalendar((s) => s.events);
  const addEvent = useCalendar((s) => s.addEvent);
  const updateEvent = useCalendar((s) => s.updateEvent);
  const removeEvent = useCalendar((s) => s.removeEvent);
  const removeEventsBefore = useCalendar((s) => s.removeEventsBefore);
  const statusColors = useStatusColors();
  const theme = useTheme();
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const [holidaysByDate, setHolidaysByDate] = useState<Record<string, string>>({});

  useEffect(() => {
    let canceled = false;
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`)
      .then((res) => res.json())
      .then((data: { date: string; localName: string }[]) => {
        if (canceled) return;
        const map: Record<string, string> = {};
        data.forEach((h) => {
          const key = h.date.slice(5);
          map[key] = h.localName;
        });
        setHolidaysByDate(map);
      })
      .catch(() => {
        if (!canceled) setHolidaysByDate({});
      });
    return () => {
      canceled = true;
    };
  }, [year]);

  const saveQuick = () => {
    if (!quickAdd || !quickTitle) return;
    const dayStr = `${year}-${pad(month + 1)}-${pad(quickAdd.day)}`;
    const start = new Date(`${dayStr}T${quickTime}`);
    const endTime = new Date(start.getTime() + quickDuration * 60000);
    const tagsArr = quickTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (editingEvent) {
      updateEvent(editingEvent.id, {
        title: quickTitle,
        date: toLocalNaive(start),
        end: toLocalNaive(endTime),
        tags: tagsArr,
        status: editingEvent.status,
        hasCountdown: editingEvent.hasCountdown,
      });
    } else {
      addEvent({
        title: quickTitle,
        date: toLocalNaive(start),
        end: toLocalNaive(endTime),
        tags: tagsArr,
        status: "scheduled",
        hasCountdown: false,
      });
    }
    closeQuickAdd();
  };

  const dayEvents = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return events.filter((e) => e.date.slice(0, 10) === dayStr);
  };

  const openQuickAddDay = (day: number) => {
    const el = document.querySelector(
      `[data-testid="day-${day}"]`,
    ) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const width = 224;
      const height = 300;
      let top = rect.bottom;
      let left = rect.left;
      top = Math.min(top, window.innerHeight - height);
      left = Math.min(left, window.innerWidth - width);
      top = Math.max(0, top);
      left = Math.max(0, left);
      lastFocusedDayRef.current = el;
      setQuickAdd({ day, top, left });
      setQuickTitle("");
      setQuickTime("09:00");
      setQuickDuration(60);
      setQuickTags("");
      setEditingEvent(null);
      setSelectedDay(day);
      setFocusedDay(day);
    }
  };

  const startEdit = (ev: CalendarEvent) => {
    const d = new Date(ev.date);
    const day = d.getDate();
    let top = quickAdd?.top ?? 0;
    let left = quickAdd?.left ?? 0;
    if (!quickAdd) {
      const el = document.querySelector(
        `[data-testid="day-${day}"]`,
      ) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        const width = 224;
        const height = 300;
        top = Math.min(rect.bottom, window.innerHeight - height);
        left = Math.min(rect.left, window.innerWidth - width);
        top = Math.max(0, top);
        left = Math.max(0, left);
        lastFocusedDayRef.current = el;
      }
    }
    setQuickAdd({ day, top, left });
    setQuickTitle(ev.title);
    setQuickTime(ev.date.slice(11, 16));
    setQuickDuration(
      Math.round(
        (new Date(ev.end).getTime() - new Date(ev.date).getTime()) / 60000,
      ),
    );
    setQuickTags((ev.tags ?? []).join(", "));
    setEditingEvent(ev);
    setSelectedDay(day);
    setFocusedDay(day);
  };

  const { focusedDay, setFocusedDay } = useKeyboardNavigation(
    daysInMonth,
    openQuickAddDay,
  );

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const handleDayClick = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 224;
    const height = 300;
    let top = rect.bottom;
    let left = rect.left;
    top = Math.min(top, window.innerHeight - height);
    left = Math.min(left, window.innerWidth - width);
    top = Math.max(0, top);
    left = Math.max(0, left);
    lastFocusedDayRef.current = e.currentTarget;
    setQuickAdd({
      day,
      top,
      left,
    });
    setQuickTitle("");
    setQuickTime("09:00");
    setQuickDuration(60);
    setQuickTags("");
    setEditingEvent(null);
    setSelectedDay(day);
    setFocusedDay(day);
  };
  useEffect(() => {
    if (!quickAdd) return;
    quickTitleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickAdd();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [quickAdd, closeQuickAdd]);

  const agendaEvents = selectedDay ? dayEvents(selectedDay) : [];
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString("default", { month: "long" }),
  );

  return (
    <Box sx={{ p: 5, pt: 20, mx: "auto", maxWidth: 1200 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={6}
        position="relative"
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeftIcon width={24} height={24} />
          </IconButton>
          <IconButton
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRightIcon width={24} height={24} />
          </IconButton>
          <Button
            variant="outlined"
            onClick={() => {
              const now = new Date();
              setCurrent(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDay(now.getDate());
            }}
          >
            Today
          </Button>
        </Box>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {current.toLocaleString("default", { month: "long" })} {year}
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Select
            size="small"
            value={month}
            onChange={(e) =>
              setCurrent(new Date(year, Number(e.target.value), 1))
            }
          >
            {monthNames.map((m, i) => (
              <MenuItem value={i} key={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
          <ButtonGroup size="small">
            {(["month", "week", "agenda"] as const).map((v) => (
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
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              const start = new Date();
              start.setHours(0, 0, 0, 0);
              if (
                window.confirm(
                  "Clear all events before today?"
                )
              ) {
                removeEventsBefore(toLocalNaive(start));
              }
            }}
          >
            Clear Past Events
          </Button>
        </Box>
      </Box>

      <Box display={{ md: "flex" }} gap={6}>
        {view === "month" ? (
          <>
            <Box flex={1}>
              <Box
                role="grid"
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridAutoRows: "minmax(140px, auto)",
                  gap: 1,
                  mb: 8,
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <Typography
                    key={d}
                    align="center"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    {d}
                  </Typography>
                ))}
                {cells.map((day, idx) => (
                  <CalendarDay
                    key={idx}
                    day={day}
                    month={month + 1}
                    events={day ? dayEvents(day) : []}
                    onDayClick={handleDayClick}
                    onPrefill={openQuickAddDay}
                    isToday={day ? isToday(day) : false}
                    isFocused={focusedDay === day}
                    isSelected={selectedDay === day}
                    holiday={
                      day
                        ? holidaysByDate[
                            `${pad(month + 1)}-${pad(day)}`
                          ] || null
                        : null
                    }
                  />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                width: { xs: "100%", md: 320 },
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Agenda
                </Typography>
                {selectedDay == null ? (
                  <Typography variant="body2" color="text.secondary">
                    Select a day
                  </Typography>
                ) : agendaEvents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No events yet
                  </Typography>
                ) : (
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                    {agendaEvents.map((ev) => (
                      <Box
                        component="li"
                        key={ev.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: statusColors[ev.status],
                            color: theme.palette.getContrastText(
                              statusColors[ev.status]
                            ),
                            fontSize: 12,
                          }}
                        >
                          {ev.status}
                        </Box>
                        <Typography sx={{ flexGrow: 1, fontSize: 14 }}>
                          {ev.title}
                        </Typography>
                        <IconButton
                          aria-label="Edit event"
                          size="small"
                          onClick={() => startEdit(ev)}
                          sx={{ color: "primary.main" }}
                        >
                          <PencilIcon width={16} height={16} />
                        </IconButton>
                        <IconButton
                          aria-label="Delete event"
                          size="small"
                          onClick={() => removeEvent(ev.id)}
                          sx={{ color: "error.main" }}
                        >
                          <TrashIcon width={16} height={16} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>

              <TagStats />
            </Box>
          </>
        ) : view === "week" ? (
          <WeekView current={current} events={events} />
        ) : (
          <AgendaView events={events} />
        )}
      </Box>

      {view === "month" && quickAdd && (
        <>
          <Box
            data-testid="quick-add-overlay"
            onClick={closeQuickAdd}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.5)",
            }}
          />
          <Paper
            sx={{ position: "fixed", zIndex: 20, p: 2, width: 224 }}
            style={{ top: quickAdd.top, left: quickAdd.left }}
          >
            <Box sx={{ mb: 2 }}>
              {dayEvents(quickAdd.day).length > 0 && (
                <Box
                  component="ul"
                  sx={{ listStyle: "none", p: 0, m: 0, mb: 2 }}
                >
                  {dayEvents(quickAdd.day).map((ev) => (
                    <Box
                      component="li"
                      key={ev.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: statusColors[ev.status],
                          color: theme.palette.getContrastText(
                            statusColors[ev.status]
                          ),
                          fontSize: 12,
                        }}
                      >
                        {ev.status}
                      </Box>
                      <Button
                        onClick={() => startEdit(ev)}
                        sx={{
                          flexGrow: 1,
                          justifyContent: "flex-start",
                          textTransform: "none",
                        }}
                      >
                        {ev.title}
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              <TextField
                inputRef={quickTitleRef}
                type="text"
                fullWidth
                placeholder="Title"
                inputProps={{ "aria-label": "Title" }}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                type="time"
                fullWidth
                value={quickTime}
                onChange={(e) => setQuickTime(e.target.value)}
                inputProps={{
                  "data-testid": "quick-time",
                  "aria-label": "Start time",
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                select
                fullWidth
                value={quickDuration}
                onChange={(e) => setQuickDuration(parseInt(e.target.value))}
                SelectProps={{
                  native: true,
                  inputProps: {
                    "data-testid": "quick-duration",
                    "aria-label": "Duration",
                  },
                }}
                sx={{ mb: 2 }}
              >
                <option value={30}>30m</option>
                <option value={60}>1h</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2h</option>
              </TextField>
              <TextField
                type="text"
                fullWidth
                placeholder="Tags (comma separated)"
                inputProps={{ "aria-label": "Tags" }}
                value={quickTags}
                onChange={(e) => setQuickTags(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button fullWidth variant="contained" onClick={saveQuick}>
                {editingEvent ? "Save" : "Add"}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}

function useKeyboardNavigation(
  daysInMonth: number,
  onSelect: (day: number) => void,
) {
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusedDay == null) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setFocusedDay(Math.max(1, focusedDay - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedDay(Math.min(daysInMonth, focusedDay + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedDay(Math.max(1, focusedDay - 7));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedDay(Math.min(daysInMonth, focusedDay + 7));
          break;
        case "Enter":
          e.preventDefault();
          onSelect(focusedDay);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedDay, daysInMonth, onSelect]);

  useEffect(() => {
    if (focusedDay != null) {
      const el = document.querySelector(
        `[data-testid="day-${focusedDay}"]`,
      ) as HTMLElement | null;
      el?.focus();
    }
  }, [focusedDay]);

  return { focusedDay, setFocusedDay };
}

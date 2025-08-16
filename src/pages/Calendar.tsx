import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import CalendarDay from "../components/CalendarDay";
import TagStats from "../components/TagStats";
import { useCalendar } from "../features/calendar/useCalendar";
import { statusColors } from "../features/calendar/statusColors";
import type { CalendarEvent } from "../features/calendar/types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const HOLIDAYS = [
  { month: 0, day: 1, title: "New Year's Day" },
  { month: 6, day: 4, title: "Independence Day" },
  { month: 10, day: 31, title: "Halloween" },
  { month: 11, day: 25, title: "Christmas Day" },
];

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [quickAdd, setQuickAdd] = useState<
    { day: number; top: number; left: number } | null
  >(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDuration, setQuickDuration] = useState(60);

  // add-event form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [timeError, setTimeError] = useState(false);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<
    "scheduled" | "canceled" | "missed" | "completed"
  >("scheduled");
  const [hasCountdown, setHasCountdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const events = useCalendar((s) => s.events);
  const addEvent = useCalendar((s) => s.addEvent);
  const updateEvent = useCalendar((s) => s.updateEvent);
  const removeEvent = useCalendar((s) => s.removeEvent);
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

  const save = () => {
    if (!title || !date || !end || timeError) return;
    const tagsArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (editingId) {
      updateEvent(editingId, {
        title,
        date,
        end,
        tags: tagsArr,
        status,
        hasCountdown,
      });
    } else {
      addEvent({ title, date, end, tags: tagsArr, status, hasCountdown });
    }
    setTitle("");
    setDate("");
    setEnd("");
    setTags("");
    setStatus("scheduled");
    setHasCountdown(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (!date || !end) {
      setTimeError(false);
      return;
    }
    const startTime = new Date(date).getTime();
    const endTime = new Date(end).getTime();
    if (isNaN(startTime) || isNaN(endTime)) {
      setTimeError(true);
      return;
    }
    setTimeError(endTime <= startTime);
  }, [date, end]);

  const dayEvents = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return events.filter((e) => e.date.slice(0, 10) === dayStr);
  };

  const prefillDay = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const start = `${dayStr}T09:00`;
    const endTime = `${dayStr}T10:00`;
    setDate(start);
    setEnd(endTime);
    setSelectedDay(day);
    setFocusedDay(day);
  };

  const startEdit = (ev: CalendarEvent) => {
    setTitle(ev.title);
    setDate(ev.date);
    setEnd(ev.end);
    setTags((ev.tags ?? []).join(", "));
    setStatus(ev.status ?? "scheduled");
    setHasCountdown(ev.hasCountdown ?? false);
    setEditingId(ev.id);
    const d = new Date(ev.date);
    const day = d.getDate();
    setSelectedDay(day);
    setFocusedDay(day);
    setQuickAdd(null);
  };

  const { focusedDay, setFocusedDay } = useKeyboardNavigation(
    daysInMonth,
    prefillDay
  );

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const handleDayClick = (
    day: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setQuickAdd({
      day,
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
    setQuickTitle("");
    setQuickDuration(60);
    setSelectedDay(day);
    setFocusedDay(day);
  };

  const addQuick = () => {
    if (!quickAdd || !quickTitle) return;
    const dayStr = `${year}-${pad(month + 1)}-${pad(quickAdd.day)}`;
    const start = new Date(`${dayStr}T09:00`);
    const endTime = new Date(start.getTime() + quickDuration * 60000);
    addEvent({
      title: quickTitle,
      date: start.toISOString(),
      end: endTime.toISOString(),
      tags: [],
      status: "scheduled",
      hasCountdown: false,
    });
    setQuickAdd(null);
    setQuickTitle("");
  };

  const agendaEvents = selectedDay ? dayEvents(selectedDay) : [];

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString("default", { month: "long" })
  );

  return (
    <div className="p-5 pt-20 mx-auto max-w-7xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 relative">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
          <button
            className="px-3 py-1 border rounded-md"
            onClick={() => {
              const now = new Date();
              setCurrent(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDay(now.getDate());
            }}
          >
            Today
          </button>
        </div>
        <h2 className="text-2xl font-bold absolute left-1/2 -translate-x-1/2">
          {current.toLocaleString("default", { month: "long" })} {year}
        </h2>
        <div className="flex items-center space-x-2">
          <select
            className="border rounded-md p-1"
            value={month}
            onChange={(e) =>
              setCurrent(new Date(year, Number(e.target.value), 1))
            }
          >
            {monthNames.map((m, i) => (
              <option value={i} key={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="inline-flex border rounded-md overflow-hidden">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                className={`px-3 py-1 text-sm capitalize ${
                  view === v
                    ? "bg-blue-600 text-white"
                    : "bg-white"
                }`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="md:flex md:gap-6">
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1 mb-8" role="grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (d) => (
                <div
                  key={d}
                  className="text-center font-semibold text-gray-700 py-2"
                >
                  {d}
                </div>
              )
            )}
            {cells.map((day, idx) => (
              <CalendarDay
                key={idx}
                day={day}
                events={day ? dayEvents(day) : []}
                onDayClick={handleDayClick}
                onPrefill={prefillDay}
                isToday={day ? isToday(day) : false}
                isFocused={focusedDay === day}
                isSelected={selectedDay === day}
                holiday={
                  day
                    ? HOLIDAYS.find(
                        (h) => h.month === month && h.day === day
                      )?.title || null
                    : null
                }
              />
            ))}
          </div>
        </div>

        <aside className="w-full md:w-80 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">Agenda</h3>
            {selectedDay == null ? (
              <div className="text-sm text-gray-500">Select a day</div>
            ) : agendaEvents.length === 0 ? (
              <div className="text-sm text-gray-500">No events yet</div>
            ) : (
              <ul className="space-y-1">
                {agendaEvents.map((ev) => (
                  <li key={ev.id} className="text-sm flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-white text-xs ${statusColors[ev.status]}`}
                    >
                      {ev.status}
                    </span>
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => startEdit(ev)}
                    >
                      {ev.title}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete event"
                      className="text-red-500"
                      onClick={() => removeEvent(ev.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Event" : "Add Event"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Event title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="start"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Time
                </label>
                <input
                  id="start"
                  data-testid="date-input"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="end"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Time
                </label>
                <input
                  id="end"
                  data-testid="end-input"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
                {timeError && (
                  <div
                    className="text-red-600 text-sm mt-1"
                    data-testid="time-error"
                  >
                    End time must be after start time
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="tags"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tags
                </label>
                <input
                  id="tags"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tag1, tag2"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="canceled">Canceled</option>
                  <option value="missed">Missed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center mt-2">
                <input
                  id="countdown"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={hasCountdown}
                  onChange={(e) => setHasCountdown(e.target.checked)}
                />
                <label htmlFor="countdown" className="ml-2 text-sm text-gray-700">
                  Countdown
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={save}
                disabled={timeError || !title || !date || !end}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="add-button"
              >
                {editingId ? "Update Event" : "Add Event"}
              </button>
            </div>
          </div>

          <TagStats />
        </aside>
      </div>

      {quickAdd && (
        <>
          <div
            className="fixed inset-0 z-10"
            data-testid="quick-add-overlay"
            onClick={() => setQuickAdd(null)}
          />
          <div
            className="absolute z-20 bg-white border rounded-lg shadow-md p-4 w-56"
            style={{ top: quickAdd.top, left: quickAdd.left }}
          >
            <div className="mb-2">
              {dayEvents(quickAdd.day).length > 0 && (
                <ul className="mb-2 space-y-1">
                  {dayEvents(quickAdd.day).map((ev) => (
                    <li
                      key={ev.id}
                      className="text-sm flex items-center gap-2"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-white text-xs ${statusColors[ev.status]}`}
                      >
                        {ev.status}
                      </span>
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => startEdit(ev)}
                      >
                        {ev.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="text"
                className="w-full px-2 py-1 border rounded mb-2"
                placeholder="Title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
              />
              <div className="flex gap-2 mb-2">
                <button
                  className="flex-1 px-2 py-1 border rounded"
                  onClick={() => setQuickDuration(30)}
                >
                  +30m
                </button>
                <button
                  className="flex-1 px-2 py-1 border rounded"
                  onClick={() => setQuickDuration(60)}
                >
                  +1h
                </button>
              </div>
              <button
                className="w-full bg-blue-600 text-white py-1 rounded"
                onClick={addQuick}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function useKeyboardNavigation(
  daysInMonth: number,
  onSelect: (day: number) => void
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
        `[data-testid="day-${focusedDay}"]`
      ) as HTMLElement | null;
      el?.focus();
    }
  }, [focusedDay]);

  return { focusedDay, setFocusedDay };
}


import { useState, useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useCalendar } from "../features/calendar/useCalendar";
import CalendarDay from "../components/CalendarDay";
import TagStats from "../components/TagStats";

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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [timeError, setTimeError] = useState(false);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<
    "scheduled" | "canceled" | "missed" | "completed"
  >("scheduled");
  const [hasCountdown, setHasCountdown] = useState(false);
  const events = useCalendar((s) => s.events);
  const addEvent = useCalendar((s) => s.addEvent);
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

  const add = () => {
    if (!title || !date || !end || timeError) return;
    const tagsArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    addEvent({ title, date, end, tags: tagsArr, status, hasCountdown });
    setTitle("");
    setDate("");
    setEnd("");
    setTags("");
    setStatus("scheduled");
    setHasCountdown(false);
  };

  useEffect(() => {
    if (!date || !end) {
      setTimeError(false);
      return;
    }
    setTimeError(new Date(end).getTime() <= new Date(date).getTime());
  }, [date, end]);

  const dayEvents = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return events.filter((e) => e.date.slice(0, 10) === dayStr);
  };

  const handleDayClick = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const start = `${dayStr}T09:00`;
    const endTime = `${dayStr}T10:00`;
    setDate(start);
    setEnd(endTime);
  };

  const { focusedDay, setFocusedDay } = useKeyboardNavigation(
    daysInMonth,
    handleDayClick
  );

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  useEffect(() => {
    HOLIDAYS.forEach((h) => {
      const start = new Date(year, h.month, h.day, 0, 0).toISOString();
      const end = new Date(year, h.month, h.day, 23, 59).toISOString();
      const dayStr = start.slice(0, 10);
      if (!eventsRef.current.some((e) => e.title === h.title && e.date.slice(0, 10) === dayStr)) {
        addEvent({
          title: h.title,
          date: start,
          end,
          tags: ["holiday"],
          status: "scheduled",
          hasCountdown: false,
        });
      }
    });
  }, [year]);

  return (
    <div className="p-5 pt-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {current.toLocaleString("default", { month: "long" })} {year}
        </h2>
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-8" role="grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-center font-semibold text-gray-700 py-2"
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => (
          <CalendarDay
            key={idx}
            day={day}
            events={day ? dayEvents(day) : []}
            onDayClick={(d) => {
              setFocusedDay(d);
              handleDayClick(d);
            }}
            isToday={day ? isToday(day) : false}
          />
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Add Event</h3>
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
            onClick={add}
            disabled={timeError || !title || !date || !end}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="add-button"
          >
            Add Event
          </button>
        </div>
      </div>
      <TagStats />
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

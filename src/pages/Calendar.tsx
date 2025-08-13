import { useState, useEffect, useRef } from "react";
import { useCalendar } from "../features/calendar/useCalendar";
import Countdown from "../components/Countdown";

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
    if (!title || !date || !end) return;
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
    <div style={{ padding: 20, paddingTop: 80 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}>{"<"}</button>
        <h2 style={{ margin: 0 }}>
          {current.toLocaleString("default", { month: "long" })} {year}
        </h2>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}>{">"}</button>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 10 }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontWeight: "bold" }}>
            {d}
          </div>
        ))}
        {cells.map((day, idx) => (
          <div
            key={idx}
            style={{ border: "1px solid #ccc", minHeight: 80, padding: 4, cursor: day ? "pointer" : "default" }}
            onClick={() => day && handleDayClick(day)}
          >
            {day && (
              <>
                <div style={{ fontWeight: "bold" }}>{day}</div>
                {dayEvents(day).map((ev) => (
                  <div key={ev.id} style={{ fontSize: 10, marginTop: 2 }}>
                    {ev.title}
                    {ev.tags && ev.tags.length > 0 && (
                      <div style={{ fontSize: 8 }}>#{ev.tags.join(", ")}</div>
                    )}
                    {ev.status !== "scheduled" && (
                      <div style={{ fontSize: 8 }}>{ev.status}</div>
                    )}
                    {ev.hasCountdown && (
                      <div>
                        <Countdown target={ev.date} />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <h3>Add Event</h3>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <input
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="scheduled">Scheduled</option>
          <option value="canceled">Canceled</option>
          <option value="missed">Missed</option>
          <option value="completed">Completed</option>
        </select>
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={hasCountdown}
            onChange={(e) => setHasCountdown(e.target.checked)}
          />
          Countdown
        </label>
        <button onClick={add} style={{ marginLeft: 8 }}>
          Add
        </button>
      </div>
    </div>
  );
}

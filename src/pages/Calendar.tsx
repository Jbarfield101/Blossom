import { useState } from "react";
import { useCalendar } from "../features/calendar/useCalendar";
import Countdown from "../components/Countdown";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [hasCountdown, setHasCountdown] = useState(false);
  const { events, addEvent } = useCalendar();

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const add = () => {
    if (!title || !date) return;
    addEvent({ title, date, hasCountdown });
    setTitle("");
    setDate("");
    setHasCountdown(false);
  };

  const dayEvents = (day: number) => {
    const dayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    return events.filter((e) => e.date.slice(0, 10) === dayStr);
  };

  return (
    <div style={{ padding: 20 }}>
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
          <div key={idx} style={{ border: "1px solid #ccc", minHeight: 80, padding: 4 }}>
            {day && (
              <>
                <div style={{ fontWeight: "bold" }}>{day}</div>
                {dayEvents(day).map((ev) => (
                  <div key={ev.id} style={{ fontSize: 10, marginTop: 2 }}>
                    {ev.title}
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

import { useEffect } from "react";
import Center from "./_Center";
import { useCalendar } from "../features/calendar/useCalendar";
import { useTasks } from "../store/tasks";

export default function Chores() {
  const { events } = useCalendar();
  const { tasks, subscribe } = useTasks();

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    subscribe().then((u) => {
      unlisten = u;
    });
    return () => {
      unlisten?.();
    };
  }, [subscribe]);

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const upcomingTasks = events.filter(
    (e) =>
      e.tags?.includes("task") &&
      e.status === "scheduled" &&
      new Date(e.date) >= startOfToday
  ).length;

  const missedTasks = events.filter(
    (e) =>
      e.tags?.includes("task") &&
      e.status === "scheduled" &&
      new Date(e.date) < startOfToday
  ).length;

  const currentTasks = Object.values(tasks).filter(
    (t) => t.status === "queued"
  ).length;

  return (
    <Center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          textAlign: "center",
        }}
      >
        <div>Upcoming Tasks: {upcomingTasks}</div>
        <div>Current Tasks: {currentTasks}</div>
        <div>Missed Tasks: {missedTasks}</div>
      </div>
    </Center>
  );
}

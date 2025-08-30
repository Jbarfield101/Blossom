import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TasksWidget from "./TasksWidget";
import { useCalendar } from "../features/calendar/useCalendar";

describe("TasksWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-10T00:00:00"));
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCalendar.setState({ events: [], selectedCountdownId: null, tagTotals: {} });
  });

  it("filters events to only show tasks", () => {
    useCalendar.setState({
      events: [
        {
          id: "1",
          title: "Task Today",
          date: "2024-01-10T09:00:00",
          end: "2024-01-10T10:00:00",
          tags: ["task"],
          status: "scheduled",
          hasCountdown: false,
        },
        {
          id: "2",
          title: "Not Task",
          date: "2024-01-10T11:00:00",
          end: "2024-01-10T12:00:00",
          tags: [],
          status: "scheduled",
          hasCountdown: false,
        },
        {
          id: "3",
          title: "Task Tomorrow",
          date: "2024-01-11T09:00:00",
          end: "2024-01-11T10:00:00",
          tags: ["task"],
          status: "scheduled",
          hasCountdown: false,
        },
      ],
      selectedCountdownId: null,
      tagTotals: {},
    });
    render(<TasksWidget />);
    expect(screen.getByText("Task Today")).toBeInTheDocument();
    expect(screen.queryByText("Not Task")).toBeNull();
    expect(screen.queryByText("Task Tomorrow")).toBeNull();
  });

  it("shows empty state when no tasks today", () => {
    render(<TasksWidget />);
    expect(screen.getByText("No tasks today!")).toBeInTheDocument();
  });

  it("switches between views", () => {
    useCalendar.setState({
      events: [
        {
          id: "1",
          title: "Task Today",
          date: "2024-01-10T09:00:00",
          end: "2024-01-10T10:00:00",
          tags: ["task"],
          status: "scheduled",
          hasCountdown: false,
        },
        {
          id: "2",
          title: "Task This Week",
          date: "2024-01-12T09:00:00",
          end: "2024-01-12T10:00:00",
          tags: ["task"],
          status: "scheduled",
          hasCountdown: false,
        },
        {
          id: "3",
          title: "Task This Month",
          date: "2024-01-25T09:00:00",
          end: "2024-01-25T10:00:00",
          tags: ["task"],
          status: "scheduled",
          hasCountdown: false,
        },
      ],
      selectedCountdownId: null,
      tagTotals: {},
    });
    render(<TasksWidget />);
    expect(screen.getByText("Task Today")).toBeInTheDocument();
    expect(screen.queryByText("Task This Week")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /week/i }));
    expect(screen.getByText("Task This Week")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /month/i }));
    expect(screen.getByText("Task This Month")).toBeInTheDocument();
  });
});


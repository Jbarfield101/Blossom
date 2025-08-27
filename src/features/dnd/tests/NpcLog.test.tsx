import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import NpcLog from "../NpcLog";

describe("NpcLog", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("shows error entries", async () => {
    (invoke as any).mockResolvedValue([
      {
        timestamp: "2024-01-01T00:00:00Z",
        world: "w",
        id: "",
        name: "",
        errorCode: "E1",
        message: "boom",
      },
    ]);
    render(<NpcLog />);
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to import/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/E1/)).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it("clears the log", async () => {
    (invoke as any)
      .mockResolvedValueOnce([
        {
          timestamp: "2024-01-01T00:00:00Z",
          world: "w",
          id: "1",
          name: "Test",
        },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    render(<NpcLog />);
    await waitFor(() =>
      expect(screen.getByText(/Test/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText(/clear log/i));

    await waitFor(() =>
      expect(screen.getByText(/No entries/)).toBeInTheDocument(),
    );
    expect((invoke as any).mock.calls[1][0]).toBe("clear_npc_log");
  });
});

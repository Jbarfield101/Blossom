import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const enqueueTask = vi.fn();
const loadNPCs = vi.fn();
const tasksState: any = { enqueueTask, tasks: {} };

vi.mock("../../../store/tasks", () => ({
  useTasks: (selector: any) => selector(tasksState),
}));
vi.mock("../../../store/npcs", () => ({
  useNPCs: (selector: any) => selector({ loadNPCs }),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import NpcPdfUpload from "../NpcPdfUpload";

describe("NpcPdfUpload logging", () => {
  beforeEach(() => {
    tasksState.tasks = {};
    enqueueTask.mockResolvedValue(1);
    (open as any).mockResolvedValue("/tmp/npc.pdf");
    (invoke as any).mockReset();
    loadNPCs.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("logs successful imports", async () => {
    tasksState.tasks = {
      1: { status: "completed", result: [{ id: "1", name: "Bob" }] },
    };
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "list_npcs") return Promise.resolve([]);
      if (cmd === "read_npc_log") return Promise.resolve([]);
      return Promise.resolve();
    });

    render(<NpcPdfUpload world="w" />);
    fireEvent.click(screen.getByText(/upload npc pdf/i));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("append_npc_log", {
        world: "w",
        id: "1",
        name: "Bob",
      }),
    );
  });

  it("logs failed imports", async () => {
    tasksState.tasks = {
      1: { status: "failed", error: "boom", errorCode: "E1" },
    };
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "read_npc_log") return Promise.resolve([]);
      return Promise.resolve();
    });

    render(<NpcPdfUpload world="w" />);
    fireEvent.click(screen.getByText(/upload npc pdf/i));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("append_npc_log", {
        world: "w",
        id: "",
        name: "",
        errorCode: "E1",
        message: "boom",
      }),
    );
  });
});

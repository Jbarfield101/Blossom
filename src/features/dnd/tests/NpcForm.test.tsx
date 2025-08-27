import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
vi.mock("../../../store/voices", () => ({
  useVoices: (selector: any) =>
    selector({
      voices: [],
      filter: () => true,
      toggleFavorite: vi.fn(),
      load: vi.fn().mockResolvedValue(undefined),
    }),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import NpcForm from "../NpcForm";

describe("NpcForm PDF import", () => {
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

  it("fills fields and loads library from parsed NPC", async () => {
    tasksState.tasks = {
      1: {
        status: "completed",
        result: {
          npcs: [
            {
              id: "1",
              name: "Bob",
              species: "Human",
              role: "Villain",
              alignment: "Neutral",
              playerCharacter: false,
            },
          ],
        },
      },
    };
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "list_npcs") return Promise.resolve([]);
      if (cmd === "read_npc_log") return Promise.resolve([]);
      return Promise.resolve();
    });

    render(<NpcForm world="w" />);
    fireEvent.click(screen.getByRole("button", { name: /upload npc pdf/i }));

    await waitFor(() => expect(screen.getByLabelText(/name/i)).toHaveValue("Bob"));
    expect(screen.getByLabelText(/species/i)).toHaveValue("Human");
    expect(screen.getByLabelText(/role/i)).toHaveValue("Villain");
    expect(loadNPCs).toHaveBeenCalledWith("w");
  });
});

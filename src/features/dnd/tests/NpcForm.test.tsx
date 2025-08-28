import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const enqueueTask = vi.fn();
const loadNPCs = vi.fn();
const addNPC = vi.fn();
const tasksState: any = { enqueueTask, tasks: {} };

vi.mock("../../../store/tasks", () => ({
  useTasks: (selector: any) => selector(tasksState),
}));
vi.mock("../../../store/npcs", () => ({
  useNPCs: (selector: any) => selector({ loadNPCs, addNPC }),
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
    addNPC.mockReset();
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

describe("NpcForm submission", () => {
  beforeEach(() => {
    tasksState.tasks = {};
    enqueueTask.mockResolvedValue(1);
    (open as any).mockResolvedValue("/tmp/npc.pdf");
    (invoke as any).mockReset();
    loadNPCs.mockResolvedValue(undefined);
    addNPC.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it(
    "resets form and shows success snackbar after saving",
    async () => {
      const npc = {
        id: "1",
        name: "Alice",
        species: "Elf",
        role: "Ranger",
        alignment: "Neutral",
        playerCharacter: false,
        hooks: ["quest"],
        tags: ["ally"],
        statblock: {},
      };

    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "save_npc") return Promise.resolve(npc);
      return Promise.resolve();
    });

    render(<NpcForm world="w" />);

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: npc.name },
    });
    fireEvent.change(screen.getByLabelText(/species/i), {
      target: { value: npc.species },
    });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: npc.role },
    });
    fireEvent.change(screen.getByLabelText(/alignment/i), {
      target: { value: npc.alignment },
    });
    fireEvent.change(screen.getByLabelText(/hooks/i), {
      target: { value: npc.hooks.join(",") },
    });
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: npc.tags.join(",") },
    });

    const statblockInput = screen.getByLabelText(/statblock json/i);
    fireEvent.change(statblockInput, { target: { value: "{" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(screen.getByText(/invalid json/i)).toBeInTheDocument());

    fireEvent.change(statblockInput, { target: { value: "{}" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("save_npc", {
        world: "w",
        npc: expect.objectContaining({ name: "Alice" }),
      })
    );

      await waitFor(() => expect(addNPC).toHaveBeenCalledWith(npc));
      expect(screen.getByLabelText(/name/i)).toHaveValue("");
      expect(screen.queryByText(/invalid json/i)).not.toBeInTheDocument();
      expect(
        screen.getByText(/npc alice saved successfully/i)
      ).toBeInTheDocument();
    },
    10000
  );
});

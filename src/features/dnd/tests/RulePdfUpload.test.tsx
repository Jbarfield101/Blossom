import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { open } from "@tauri-apps/plugin-dialog";
const enqueueTask = vi.fn().mockResolvedValue(1);
const state: { enqueueTask: any; tasks: Record<number, any> } = {
  enqueueTask,
  tasks: {},
};
vi.mock("../../../store/tasks", () => ({
  useTasks: (selector: any) => selector(state),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ __esModule: true, invoke: vi.fn() }));
import { invoke } from "@tauri-apps/api/core";
import RulePdfUpload from "../RulePdfUpload";

describe("RulePdfUpload", () => {
  beforeEach(() => {
    enqueueTask.mockResolvedValue(1);
  });
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    state.tasks = {};
  });

  it("queues rule parsing task", async () => {
    (open as any).mockResolvedValue("/tmp/rules.pdf");

    render(<RulePdfUpload />);
    fireEvent.click(screen.getByText(/upload rule pdf/i));

    await waitFor(() => expect(open).toHaveBeenCalled());
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
  });

  it("saves parsed rules when task completes", async () => {
    state.tasks[1] = {
      status: "completed",
      result: {
        rules: [
          { name: "Ability Checks", description: "desc" },
          { name: "Homebrew", description: "custom" },
        ],
      },
    };
    (open as any).mockResolvedValue("/tmp/rules.pdf");
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "list_rules") return Promise.resolve([]);
      return Promise.resolve();
    });

    render(<RulePdfUpload />);
    fireEvent.click(screen.getByText(/upload rule pdf/i));
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        invoke.mock.calls.filter(([cmd]: any[]) => cmd === "save_rule").length,
      ).toBe(2),
    );
  });
});

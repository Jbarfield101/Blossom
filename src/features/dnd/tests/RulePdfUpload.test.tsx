import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { open } from "@tauri-apps/plugin-dialog";
const enqueueTask = vi.fn().mockResolvedValue(1);
vi.mock("../../../store/tasks", () => ({
  useTasks: (selector: any) => selector({ enqueueTask, tasks: {} }),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
import RulePdfUpload from "../RulePdfUpload";

describe("RulePdfUpload", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("queues rule parsing task", async () => {
    (open as any).mockResolvedValue("/tmp/rules.pdf");

    render(<RulePdfUpload />);
    fireEvent.click(screen.getByText(/upload rule pdf/i));

    await waitFor(() => expect(open).toHaveBeenCalled());
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
  });
});


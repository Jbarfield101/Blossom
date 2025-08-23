import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { open } from "@tauri-apps/plugin-dialog";
const enqueueTask = vi.fn().mockResolvedValue(1);
vi.mock("../../../store/tasks", () => ({
  useTasks: (selector: any) => selector({ enqueueTask, tasks: {} }),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
import SpellPdfUpload from "../SpellPdfUpload";

describe("SpellPdfUpload", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("queues spell parsing task", async () => {
    (open as any).mockResolvedValue("/tmp/spells.pdf");

    render(<SpellPdfUpload />);
    fireEvent.click(screen.getByText(/upload spell pdf/i));

    await waitFor(() => expect(open).toHaveBeenCalled());
    await waitFor(() => expect(enqueueTask).toHaveBeenCalled());
  });
});

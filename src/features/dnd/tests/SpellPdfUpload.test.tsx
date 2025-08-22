import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SpellPdfUpload from "../SpellPdfUpload";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("SpellPdfUpload", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("uploads and classifies spells", async () => {
    (open as any).mockResolvedValue("/tmp/spells.pdf");
    (invoke as any).mockResolvedValue([{ name: "Fireball", description: "boom" }]);

    render(<SpellPdfUpload />);
    fireEvent.click(screen.getByText(/upload spell pdf/i));

    await waitFor(() => expect(open).toHaveBeenCalled());
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await screen.findByText(/Fireball/i);
  });
});

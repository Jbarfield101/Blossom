import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import RulePdfUpload from "../RulePdfUpload";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("RulePdfUpload", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("uploads and classifies rules", async () => {
    (open as any).mockResolvedValue("/tmp/rules.pdf");
    (invoke as any).mockResolvedValue([{ name: "Ability Checks", description: "roll" }]);

    render(<RulePdfUpload />);
    fireEvent.click(screen.getByText(/upload rule pdf/i));

    await waitFor(() => expect(open).toHaveBeenCalled());
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await screen.findByText(/Ability Checks/i);
  });
});

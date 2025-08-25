import { describe, it, expect, afterEach, vi } from "vitest";
vi.mock("../features/dnd/DiceRoller", () => ({ default: () => null }));
vi.mock("../features/dnd/TabletopMap", () => ({ default: () => null }));
vi.mock("../features/dnd/WarTable", () => ({ default: () => null }));
vi.mock("./NPCList", () => ({ default: () => null }));
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DND from "./DND";
import { useWorlds } from "../store/worlds";

describe("DND world selector", () => {
  afterEach(() => {
    cleanup();
    useWorlds.setState({ worlds: [], currentWorld: '' });
    useWorlds.persist.clearStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("allows creating and saving a new world", async () => {
    render(<DND />);
    const select = screen.getByRole("combobox", { name: "World" });
    await userEvent.click(select);
    await userEvent.click(screen.getByRole("option", { name: "Create New World" }));
    const input = await screen.findByLabelText("World Name");
    await userEvent.type(input, "Eberron");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByDisplayValue("Eberron")).toBeInTheDocument();
    expect(useWorlds.getState().worlds).toContain("Eberron");
    expect(useWorlds.getState().currentWorld).toBe("Eberron");
  });
});

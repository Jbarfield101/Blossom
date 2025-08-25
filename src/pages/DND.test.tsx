import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import DND from "./DND";
import { useWorlds } from "../store/worlds";

describe("DND world selector", () => {
  afterEach(() => {
    cleanup();
    useWorlds.setState({ worlds: [] });
    useWorlds.persist.clearStorage();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("allows creating and saving a new world", () => {
    vi.spyOn(window, "prompt").mockReturnValue("Eberron");
    render(<DND />);
    fireEvent.change(screen.getByLabelText("World"), {
      target: { value: "__new__" },
    });
    expect(screen.getByDisplayValue("Eberron")).toBeInTheDocument();
    expect(useWorlds.getState().worlds).toContain("Eberron");
  });
});

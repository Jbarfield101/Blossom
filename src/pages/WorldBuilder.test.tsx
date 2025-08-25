import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import WorldBuilder from "./WorldBuilder";
import { useWorlds } from "../store/worlds";

describe("WorldBuilder", () => {
  afterEach(() => {
    cleanup();
    useWorlds.setState({ worlds: [], currentWorld: '' });
    useWorlds.persist.clearStorage();
    localStorage.clear();
  });

  it("persists worlds across remounts", () => {
    const { unmount } = render(<WorldBuilder />);
    fireEvent.click(screen.getByText("Create New World"));
    fireEvent.change(screen.getByLabelText("World Name"), {
      target: { value: "Faerun" },
    });
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByText("Faerun")).toBeInTheDocument();
    unmount();
    render(<WorldBuilder />);
    expect(screen.getByText("Faerun")).toBeInTheDocument();
  });
});

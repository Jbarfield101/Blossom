import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WorldBuilder from "./WorldBuilder";

describe("WorldBuilder", () => {
  it("adds a world after submitting", () => {
    render(<WorldBuilder />);
    fireEvent.click(screen.getByText("Create New World"));
    fireEvent.change(screen.getByLabelText("World Name"), {
      target: { value: "Faerun" },
    });
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByText("Faerun")).toBeInTheDocument();
  });
});

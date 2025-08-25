import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../dnd/rules", () => ({
  rollDiceExpression: vi.fn(() => ({
    total: 7,
    rolls: [
      { sides: 8, value: 3 },
      { sides: 8, value: 4 },
    ],
  })),
}));

import { rollDiceExpression } from "../../../dnd/rules";
import DiceRoller from "../DiceRoller";

describe("DiceRoller", () => {
  it("builds expression from toggles and rolls dice", async () => {
    render(<DiceRoller />);
    const user = userEvent.setup();

    const countInput = screen.getByRole("spinbutton", { name: /count/i });
    await user.clear(countInput);
    await user.type(countInput, "2");

    await user.click(screen.getByRole("button", { name: /d8/i }));

    expect(screen.getByRole("textbox", { name: /dice/i })).toHaveValue("2d8");

    await user.click(screen.getByRole("button", { name: /roll/i }));

    expect(rollDiceExpression).toHaveBeenCalledWith("2d8");
    await screen.findByText("Result: 7 ( 3, 4 )");
  });
});

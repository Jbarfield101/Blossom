import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../dnd/rules", () => ({
  rollDiceExpression: vi.fn(),
}));

import { rollDiceExpression } from "../../../dnd/rules";
import DiceRoller from "../DiceRoller";

const mockedRollDiceExpression = vi.mocked(rollDiceExpression);

describe.sequential("DiceRoller", () => {
  beforeEach(() => {
    mockedRollDiceExpression.mockReset();
  });

  it("builds expression from toggles and rolls dice", async () => {
    mockedRollDiceExpression.mockReturnValue({
      total: 7,
      rolls: [
        { sides: 8, value: 3 },
        { sides: 8, value: 4 },
      ],
    });

    render(<DiceRoller />);
    const user = userEvent.setup();

    const countInput = screen.getAllByRole("spinbutton", { name: /count/i })[0];
    await user.clear(countInput);
    await user.type(countInput, "2");

    await user.click(
      screen.getAllByRole("button", { name: /d8/i })[0]
    );

    expect(screen.getByRole("textbox", { name: /dice/i })).toHaveValue("2d8");

    await user.click(screen.getByRole("button", { name: /roll/i }));

    expect(mockedRollDiceExpression).toHaveBeenCalledWith("2d8");
    await screen.findByText("Result: 7 ( 3, 4 )");
  });

  it.each([4, 8, 10, 12, 20])(
    "selects d% and renders dice",
    async (sides) => {
      mockedRollDiceExpression.mockReturnValue({
        total: sides + 1,
        rolls: [
          { sides, value: 1 },
          { sides, value: sides },
        ],
      });

      render(<DiceRoller />);
      const user = userEvent.setup();

      const countInput = screen.getAllByRole("spinbutton", { name: /count/i })[0];
      await user.clear(countInput);
      await user.type(countInput, "2");

      const toggle = screen.getAllByRole("button", {
        name: new RegExp(`d${sides}`, "i"),
      })[0];
      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-pressed", "true");

      await user.click(screen.getAllByRole("button", { name: /roll/i })[0]);

      expect(mockedRollDiceExpression).toHaveBeenCalledWith(`2d${sides}`);
      await screen.findByText(`Result: ${sides + 1} ( 1, ${sides} )`);

      const canvas = document.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    }
  );
});

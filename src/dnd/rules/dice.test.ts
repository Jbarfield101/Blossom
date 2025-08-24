import { describe, expect, it } from "vitest";
import { rollDice, rollDiceExpression } from "./dice";

describe("rollDice", () => {
  it("uses provided rng for deterministic results", () => {
    const rng = () => 0.5;
    const first = rollDice(6, rng);
    const second = rollDice(6, rng);
    expect(first).toBe(4);
    expect(second).toBe(4);
  });
});

describe("rollDiceExpression", () => {
  it("rolls multiple dice from an expression", () => {
    const values = [0.5, 0.5, 0.5];
    let i = 0;
    const rng = () => values[i++];
    const result = rollDiceExpression("2d20 + 1d4", rng);
    expect(result.total).toBe(25);
    expect(result.rolls).toEqual([
      { sides: 20, value: 11 },
      { sides: 20, value: 11 },
      { sides: 4, value: 3 },
    ]);
  });
});


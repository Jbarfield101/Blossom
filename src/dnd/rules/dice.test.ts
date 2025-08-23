import { describe, expect, it } from "vitest";
import { rollDice } from "./dice";

describe("rollDice", () => {
  it("uses provided rng for deterministic results", () => {
    const rng = () => 0.5;
    const first = rollDice(6, rng);
    const second = rollDice(6, rng);
    expect(first).toBe(4);
    expect(second).toBe(4);
  });
});


import { describe, expect, it } from "vitest";
import {
  abilityCheck,
  attackRoll,
  calculateDamage,
  savingThrow,
  CombatEngine,
} from "./index";
import type { Character } from "../characters";

describe("dnd rules", () => {
  const baseChar: Character = {
    abilities: {
      strength: 3,
      dexterity: 2,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    class: "fighter",
    level: 1,
    hp: 10,
    inventory: [],
    spells: [],
    spellSlots: {},
  };

  it("passes ability checks when total meets DC", () => {
    const result = abilityCheck(
      baseChar,
      "strength",
      10,
      () => 0.7
    );
    expect(result).toEqual({ roll: 15, total: 18, success: true });
  });

  it("fails ability checks when total below DC", () => {
    const result = abilityCheck(
      baseChar,
      "strength",
      10,
      () => 0.05
    );
    expect(result).toEqual({ roll: 2, total: 5, success: false });
  });

  it("determines attack hits", () => {
    const result = attackRoll(
      baseChar,
      "strength",
      15,
      () => 0.55
    );
    expect(result).toEqual({
      roll: 12,
      total: 15,
      hit: true,
      critical: false,
      fumble: false,
    });
  });

  it("identifies critical hits on natural 20", () => {
    const result = attackRoll(
      baseChar,
      "strength",
      50,
      () => 0.99
    );
    expect(result).toEqual({
      roll: 20,
      total: 23,
      hit: true,
      critical: true,
      fumble: false,
    });
  });

  it("identifies fumbles on natural 1", () => {
    const result = attackRoll(
      baseChar,
      "strength",
      1,
      () => 0
    );
    expect(result).toEqual({
      roll: 1,
      total: 4,
      hit: false,
      critical: false,
      fumble: true,
    });
  });

  it("calculates damage with modifiers", () => {
    const values = [0.5, 0.6666667];
    const rng = () => values.shift()!;
    const result = calculateDamage(2, 6, 2, rng);
    expect(result).toEqual({ rolls: [4, 5], total: 11 });
  });

  it("resolves saving throws", () => {
    const result = savingThrow(
      baseChar,
      "dexterity",
      12,
      () => 0.35
    );
    expect(result).toEqual({ roll: 8, total: 10, success: false });
  });

  it("resolves combat attacks and damage", () => {
    const values = [0.65, 0.625];
    const rng = () => values.shift()!;
    const result = CombatEngine.resolveAttack(
      baseChar,
      15,
      {
        diceCount: 1,
        diceSides: 8,
        ability: "strength",
      },
      rng
    );
    expect(result).toEqual({
      roll: 14,
      total: 17,
      hit: true,
      critical: false,
      fumble: false,
      damage: 9,
    });
  });

  it("applies double damage on critical hits", () => {
    const values = [0.99, 0.625];
    const rng = () => values.shift()!;
    const result = CombatEngine.resolveAttack(
      baseChar,
      30,
      {
        diceCount: 1,
        diceSides: 8,
        ability: "strength",
      },
      rng
    );
    expect(result).toEqual({
      roll: 20,
      total: 23,
      hit: true,
      critical: true,
      fumble: false,
      damage: 18,
    });
  });

  it("returns zero damage on natural 1 even if total beats AC", () => {
    const result = CombatEngine.resolveAttack(
      baseChar,
      2,
      {
        diceCount: 1,
        diceSides: 8,
        ability: "strength",
      },
      () => 0
    );
    expect(result).toEqual({
      roll: 1,
      total: 4,
      hit: false,
      critical: false,
      fumble: true,
      damage: 0,
    });
  });
});

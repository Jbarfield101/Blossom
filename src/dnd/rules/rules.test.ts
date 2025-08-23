import { describe, expect, it, vi } from "vitest";
import {
  abilityCheck,
  attackRoll,
  calculateDamage,
  savingThrow,
  CombatEngine,
} from "./index";
import type { Character } from "../characters";
import * as dice from "./dice";

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
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(15);
    const result = abilityCheck(baseChar, "strength", 10);
    expect(result).toEqual({ roll: 15, total: 18, success: true });
    spy.mockRestore();
  });

  it("fails ability checks when total below DC", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(2);
    const result = abilityCheck(baseChar, "strength", 10);
    expect(result).toEqual({ roll: 2, total: 5, success: false });
    spy.mockRestore();
  });

  it("determines attack hits", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(12);
    const result = attackRoll(baseChar, "strength", 15);
    expect(result).toEqual({
      roll: 12,
      total: 15,
      hit: true,
      critical: false,
      fumble: false,
    });
    spy.mockRestore();
  });

  it("identifies critical hits on natural 20", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(20);
    const result = attackRoll(baseChar, "strength", 50);
    expect(result).toEqual({
      roll: 20,
      total: 23,
      hit: true,
      critical: true,
      fumble: false,
    });
    spy.mockRestore();
  });

  it("identifies fumbles on natural 1", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(1);
    const result = attackRoll(baseChar, "strength", 1);
    expect(result).toEqual({
      roll: 1,
      total: 4,
      hit: false,
      critical: false,
      fumble: true,
    });
    spy.mockRestore();
  });

  it("calculates damage with modifiers", () => {
    const spy = vi.spyOn(dice, "rollDice");
    spy.mockReturnValueOnce(4).mockReturnValueOnce(5);
    const result = calculateDamage(2, 6, 2);
    expect(result).toEqual({ rolls: [4, 5], total: 11 });
    spy.mockRestore();
  });

  it("resolves saving throws", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(8);
    const result = savingThrow(baseChar, "dexterity", 12);
    expect(result).toEqual({ roll: 8, total: 10, success: false });
    spy.mockRestore();
  });

  it("resolves combat attacks and damage", () => {
    const spy = vi.spyOn(dice, "rollDice");
    spy.mockReturnValueOnce(14).mockReturnValueOnce(6);
    const result = CombatEngine.resolveAttack(baseChar, 15, {
      diceCount: 1,
      diceSides: 8,
      ability: "strength",
    });
    expect(result).toEqual({
      roll: 14,
      total: 17,
      hit: true,
      critical: false,
      fumble: false,
      damage: 9,
    });
    spy.mockRestore();
  });

  it("applies double damage on critical hits", () => {
    const spy = vi.spyOn(dice, "rollDice");
    spy.mockReturnValueOnce(20).mockReturnValueOnce(6);
    const result = CombatEngine.resolveAttack(baseChar, 30, {
      diceCount: 1,
      diceSides: 8,
      ability: "strength",
    });
    expect(result).toEqual({
      roll: 20,
      total: 23,
      hit: true,
      critical: true,
      fumble: false,
      damage: 18,
    });
    spy.mockRestore();
  });

  it("returns zero damage on natural 1 even if total beats AC", () => {
    const spy = vi.spyOn(dice, "rollDice").mockReturnValue(1);
    const result = CombatEngine.resolveAttack(baseChar, 2, {
      diceCount: 1,
      diceSides: 8,
      ability: "strength",
    });
    expect(result).toEqual({
      roll: 1,
      total: 4,
      hit: false,
      critical: false,
      fumble: true,
      damage: 0,
    });
    spy.mockRestore();
  });
});

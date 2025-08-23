import { describe, expect, it, vi } from "vitest";
import { Encounter } from "../encounters";
import { attack, selectTarget, MonsterAI, type Npc } from "./index";
import * as rules from "../rules";

describe("Monster AI", () => {
  const baseGoblin: Npc = {
    name: "goblin",
    hp: 7,
    ac: 13,
    attackBonus: 4,
    damage: 5,
    isMonster: true,
  };

  const baseHero: Npc = {
    name: "hero",
    hp: 10,
    ac: 12,
    attackBonus: 5,
    damage: 6,
    isMonster: false,
  };

  it("selects first valid target", () => {
    const goblin = { ...baseGoblin };
    const hero = { ...baseHero };
    const target = selectTarget(goblin, [goblin, hero]);
    expect(target).toBe(hero);
  });

  it("applies damage on hit", () => {
    const goblin = { ...baseGoblin };
    const hero = { ...baseHero };
    const spy = vi.spyOn(rules, "rollDice").mockReturnValue(15);
    attack(goblin, hero);
    expect(hero.hp).toBe(5);
    spy.mockRestore();
  });

  it("plays monster turn in encounter", () => {
    const goblin = { ...baseGoblin };
    const hero = { ...baseHero };
    const encounter = new Encounter([
      { name: goblin.name, initiative: 15 },
      { name: hero.name, initiative: 10 },
    ]);
    const ai = new MonsterAI([goblin, hero]);
    const spy = vi.spyOn(rules, "rollDice").mockReturnValue(15);
    const next = ai.takeTurn(encounter);
    expect(ai.combatants[hero.name].hp).toBe(5);
    expect(next.current).toBe(1);
    spy.mockRestore();
  });
});

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

  it("selects random valid target", () => {
    const goblin = { ...baseGoblin };
    const hero = { ...baseHero, name: "hero1" };
    const ally = { ...baseHero, name: "hero2" };
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const target = selectTarget(goblin, [hero, ally], "random");
    expect(target).toBe(ally);
    spy.mockRestore();
  });

  it("selects target with lowest HP", () => {
    const goblin = { ...baseGoblin };
    const healthy = { ...baseHero, name: "healthy" };
    const wounded = { ...baseHero, name: "wounded", hp: 4 };
    const target = selectTarget(goblin, [healthy, wounded], "lowest-hp");
    expect(target).toBe(wounded);
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

  it("plays monster turn targeting lowest HP opponent", () => {
    const goblin = { ...baseGoblin };
    const healthy = { ...baseHero, name: "healthy" };
    const wounded = { ...baseHero, name: "wounded", hp: 4 };
    const encounter = new Encounter([
      { name: goblin.name, initiative: 15 },
      { name: healthy.name, initiative: 10 },
      { name: wounded.name, initiative: 5 },
    ]);
    const ai = new MonsterAI([goblin, healthy, wounded], "lowest-hp");
    const spy = vi.spyOn(rules, "rollDice").mockReturnValue(15);
    ai.takeTurn(encounter);
    expect(ai.combatants[wounded.name].hp).toBe(0);
    expect(ai.combatants[healthy.name].hp).toBe(10);
    spy.mockRestore();
  });
});

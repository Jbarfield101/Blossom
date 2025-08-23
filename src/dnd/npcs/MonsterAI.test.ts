import { describe, expect, it } from "vitest";
import { Encounter } from "../encounters";
import { attack, selectTarget, MonsterAI, type Npc } from "./index";

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
    const target = selectTarget(goblin, [hero, ally], "random", () => 0.9);
    expect(target).toBe(ally);
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
    attack(goblin, hero, undefined, () => 0.7);
    expect(hero.hp).toBe(5);
  });

  it("plays monster turn in encounter", () => {
    const goblin = { ...baseGoblin };
    const hero = { ...baseHero };
    const encounter = new Encounter([
      { name: goblin.name, initiative: 15 },
      { name: hero.name, initiative: 10 },
    ]);
    const ai = new MonsterAI([goblin, hero]);
    const next = ai.takeTurn(encounter, () => 0.7);
    expect(ai.combatants[hero.name].hp).toBe(5);
    expect(next.current).toBe(1);
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
    ai.takeTurn(encounter, () => 0.7);
    expect(ai.combatants[wounded.name].hp).toBe(0);
    expect(ai.combatants[healthy.name].hp).toBe(10);
  });
});

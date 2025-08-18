import { describe, expect, it } from "vitest";
import { zNpc, zQuest, zEncounter } from "../schemas";

describe("dnd schemas", () => {
  it("parses NPC data", () => {
    const npc = {
      id: "1",
      name: "Goblin",
      tags: ["monster"],
      appearance: "green",
      personality: "sneaky",
      motivation: "loot",
      secret: "afraid of light",
      hooks: ["steal"],
      stat_block_ref: "goblin",
      stat_overrides: "hp 10",
      theme: "Parchment",
    };
    expect(zNpc.parse(npc)).toEqual(npc);
  });

  it("parses Quest data", () => {
    const quest = {
      id: "q1",
      name: "Find the ring",
      tier: "1",
      summary: "Find the ring summary",
      beats: ["start"],
      rewards: { gp: "100" },
      complications: ["orcs"],
      theme: "Ink",
    };
    expect(zQuest.parse(quest)).toEqual(quest);
  });

  it("parses Encounter data", () => {
    const encounter = {
      id: "e1",
      name: "Goblin ambush",
      level: "1",
      creatures: ["goblin"],
      tactics: "hit and run",
      terrain: "forest",
      treasure: "gold",
      scaling: "add more goblins",
      theme: "Minimal",
    };
    expect(zEncounter.parse(encounter)).toEqual(encounter);
  });
});

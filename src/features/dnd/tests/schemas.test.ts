import { describe, expect, it } from "vitest";
import { zNpc, zLore, zQuest, zEncounter } from "../schemas";

describe("dnd schemas", () => {
  it("parses NPC data", () => {
    const npc = {
      id: "1",
      name: "Goblin Scout",
      species: "Goblinoid",
      role: "Scout",
      alignment: "CE",
      hooks: ["steal"],
      voice: { style: "gravelly", provider: "acme", preset: "goblin" },
      statblock: {},
      tags: ["monster"],
    };
    expect(zNpc.parse(npc)).toEqual(npc);
  });

  it("rejects NPCs with empty voice fields", () => {
    const npc = {
      id: "1",
      name: "Goblin Scout",
      species: "Goblinoid",
      role: "Scout",
      alignment: "CE",
      hooks: ["steal"],
      voice: { style: "", provider: "", preset: "" },
      statblock: {},
      tags: ["monster"],
    };
    expect(() => zNpc.parse(npc)).toThrowError();
  });

  it("parses Lore data", () => {
    const lore = {
      id: "l1",
      name: "Ancient Ruins",
      summary: "Crumbling stones from a lost age",
      tags: ["history"],
    };
    expect(zLore.parse(lore)).toEqual(lore);
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

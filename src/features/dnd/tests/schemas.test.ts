import { describe, expect, it } from "vitest";
import { zLore, zQuest, zEncounter } from "../schemas";
import { zNpc } from "../../../dnd/schemas/npc";

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

  it("rejects NPCs missing required fields", () => {
    const npc = {
      id: "1",
      species: "Goblinoid",
      role: "Scout",
      alignment: "CE",
      hooks: ["steal"],
      voice: { style: "gravelly", provider: "acme", preset: "goblin" },
      statblock: {},
      tags: ["monster"],
    };
    expect(() => zNpc.parse(npc)).toThrowError();
  });

  it("rejects NPCs with empty required fields", () => {
    const npc = {
      id: "", // empty string
      name: "",
      species: "Goblinoid",
      role: "Scout",
      alignment: "CE",
      hooks: [], // empty array
      voice: { style: "gravelly", provider: "acme", preset: "goblin" },
      statblock: {},
      tags: ["monster"],
    } as any;
    expect(() => zNpc.parse(npc)).toThrowError();
  });

  it("rejects NPCs with invalid hook types", () => {
    const npc = {
      id: "1",
      name: "Goblin Scout",
      species: "Goblinoid",
      role: "Scout",
      alignment: "CE",
      // hooks should be an array of strings
      hooks: "steal",
      voice: { style: "gravelly", provider: "acme", preset: "goblin" },
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

  it("rejects Lore missing required fields", () => {
    const lore = {
      id: "l1",
      name: "Ancient Ruins",
      tags: ["history"],
    };
    expect(() => zLore.parse(lore)).toThrowError();
  });

  it("rejects Lore with invalid tag types", () => {
    const lore = {
      id: "l1",
      name: "Ancient Ruins",
      summary: "Crumbling stones from a lost age",
      tags: "history",
    };
    expect(() => zLore.parse(lore)).toThrowError();
  });

  it("rejects Lore with empty required fields", () => {
    const lore = {
      id: "l1",
      name: "",
      summary: "",
      tags: [],
    };
    expect(() => zLore.parse(lore)).toThrowError();
  });

  it("parses Quest data", () => {
    const quest = {
      id: "q1",
      name: "Find the ring",
      tier: 1,
      summary: "Find the ring summary",
      beats: ["start"],
      rewards: { gp: 100 },
      complications: ["orcs"],
      theme: "Ink",
    };
    expect(zQuest.parse(quest)).toEqual(quest);
  });

  it("rejects Quests missing required fields", () => {
    const quest = {
      id: "q1",
      name: "Find the ring",
      tier: 1,
      summary: "Find the ring summary",
      rewards: { gp: 100 },
      complications: ["orcs"],
      theme: "Ink",
    };
    expect(() => zQuest.parse(quest)).toThrowError();
  });

  it("rejects Quests with invalid tier types", () => {
    const quest = {
      id: "q1",
      name: "Find the ring",
      tier: "1",
      summary: "Find the ring summary",
      beats: ["start"],
      rewards: { gp: 100 },
      complications: ["orcs"],
      theme: "Ink",
    };
    expect(() => zQuest.parse(quest)).toThrowError();
  });

  it("rejects Quests with empty required fields", () => {
    const quest = {
      id: "q1",
      name: "Find the ring",
      tier: 1,
      summary: "",
      beats: [],
      rewards: { gp: 100 },
      complications: [],
      theme: "Ink",
    } as any;
    expect(() => zQuest.parse(quest)).toThrowError();
  });

  it("parses Encounter data", () => {
    const encounter = {
      id: "e1",
      name: "Goblin ambush",
      level: 1,
      creatures: ["goblin"],
      tactics: "hit and run",
      terrain: "forest",
      treasure: "gold",
      scaling: "add more goblins",
      theme: "Minimal",
    };
    expect(zEncounter.parse(encounter)).toEqual(encounter);
  });

  it("rejects Encounters missing required fields", () => {
    const encounter = {
      id: "e1",
      name: "Goblin ambush",
      creatures: ["goblin"],
      tactics: "hit and run",
      terrain: "forest",
      treasure: "gold",
      scaling: "add more goblins",
      theme: "Minimal",
    };
    expect(() => zEncounter.parse(encounter)).toThrowError();
  });

  it("rejects Encounters with invalid creature types", () => {
    const encounter = {
      id: "e1",
      name: "Goblin ambush",
      level: 1,
      creatures: "goblin",
      tactics: "hit and run",
      terrain: "forest",
      treasure: "gold",
      scaling: "add more goblins",
      theme: "Minimal",
    };
    expect(() => zEncounter.parse(encounter)).toThrowError();
  });

  it("rejects Encounters with empty required fields", () => {
    const encounter = {
      id: "e1",
      name: "Goblin ambush",
      level: 1,
      creatures: [],
      tactics: "",
      terrain: "forest",
      treasure: "gold",
      scaling: "add more goblins",
      theme: "Minimal",
    } as any;
    expect(() => zEncounter.parse(encounter)).toThrowError();
  });
});

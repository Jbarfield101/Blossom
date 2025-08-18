import { describe, expect, it } from "vitest";
import { zNpc, zQuest, zEncounter } from "../schemas";

describe("dnd schemas", () => {
  it("parses NPC data", () => {
    const npc = { id: "1", name: "Goblin" };
    expect(zNpc.parse(npc)).toEqual(npc);
  });

  it("parses Quest data", () => {
    const quest = { id: "q1", name: "Find the ring" };
    expect(zQuest.parse(quest)).toEqual(quest);
  });

  it("parses Encounter data", () => {
    const encounter = { id: "e1", name: "Goblin ambush" };
    expect(zEncounter.parse(encounter)).toEqual(encounter);
  });
});

---
type: npc
id: npc_mara_ravensong
name: Mara Ravensong
pronouns: she/her
ancestry: Half-Elf
role: Smuggler-Archivist
level: 3
alignment: CG
tags: [port, underworld, rumor-broker, music:melancholy, biome:coastal, vibe:rainy]
appearance: "Sea-gray cloak, ink-stained fingers, silver ear-cuffs."
traits: ["soft-spoken", "curious", "won’t hurt innocents"]
goals: ["protect hidden archive", "repay old debt"]
secrets: ["keeps a cursed ledger", "knows a guard captain’s vice"]
hooks: ["needs a crew to lift a crate at midnight", "offers intel for a price"]
relationships:
  - { type: contact, target: npc_jax_caldwell, note: "buys maps" }
  - { type: enemy,  target: faction_black_sails }
music_cue:
  bpm: 78
  ambience: ["rain","cafe"]
  instruments: ["piano","airy pads"]
  mood: ["nostalgic","calm"]
license: CC-BY-4.0
---
**Tactics.** Runs, hides, bargains. Knows the tunnels under Dock 3.

import { z } from "zod";
import type { Ability } from "../characters";

const abilities: [
  Ability,
  Ability,
  Ability,
  Ability,
  Ability,
  Ability,
] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const zNpc = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  role: z.string().min(1),
  alignment: z.string().min(1),
  playerCharacter: z.boolean(),
  age: z.number().int().positive().optional(),
  backstory: z.string().optional(),
  location: z.string().optional(),
  hooks: z.array(z.string()).nonempty(),
  quirks: z.array(z.string()).optional(),
  appearance: z.string().min(1).optional(),
  voiceId: z.string().min(1).optional(),
  portrait: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  sections: z.record(z.unknown()).optional(),
  statblock: z.record(z.unknown()),
  tags: z.array(z.string()).nonempty(),
  abilities: z.record(z.enum(abilities), z.number()).optional(),
  level: z.number().int().min(1).optional(),
  hp: z.number().int().min(0).optional(),
  inventory: z.array(z.string()).optional(),
  cr: z.string().optional(),
  armorClass: z.number().int().positive().optional(),
  speed: z.string().optional(),
  savingThrows: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  senses: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  traits: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  personality: z
    .object({
      traits: z.string().optional(),
      ideals: z.string().optional(),
      bonds: z.string().optional(),
      flaws: z.string().optional(),
      voice: z.string().optional(),
    })
    .optional(),
});

export type Npc = z.infer<typeof zNpc>;

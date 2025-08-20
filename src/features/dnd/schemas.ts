import { z } from "zod";

export const zDndBase = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const zDndTheme = z.enum(["Parchment", "Ink", "Minimal"]);

/**
 * Minimal schema for non-player characters (NPCs).
 * Designed to keep downstream consumers consistent and predictable.
 */
export const zVoice = z.object({
  style: z.string().min(1),
  provider: z.string().min(1),
  preset: z.string().min(1),
});

export const zNpc = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  role: z.string().min(1),
  alignment: z.string().min(1),
  backstory: z.string().optional(),
  location: z.string().optional(),
  hooks: z.array(z.string()).nonempty(),
  quirks: z.array(z.string()).optional(),
  voice: zVoice,
  portrait: z.string().optional(),
  statblock: z.record(z.unknown()),
  tags: z.array(z.string()).nonempty(),
});

/**
 * Simple schema for world lore entries.
 */
export const zLore = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  location: z.string().optional(),
  hooks: z.array(z.string()).optional(),
  tags: z.array(z.string()).nonempty(),
});

export const zQuest = zDndBase.extend({
  tier: z.number(),
  summary: z.string().min(1),
  beats: z.array(z.string()).nonempty(),
  rewards: z.object({
    gp: z.number().optional(),
    items: z.string().optional(),
    favors: z.string().optional(),
  }),
  complications: z.array(z.string()).nonempty(),
  theme: zDndTheme,
});

export const zEncounter = zDndBase.extend({
  level: z.number(),
  creatures: z.array(z.string()).nonempty(),
  tactics: z.string().min(1),
  terrain: z.string().min(1),
  treasure: z.string().min(1),
  scaling: z.string().min(1),
  theme: zDndTheme,
});

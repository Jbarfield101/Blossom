import { z } from "zod";

export const zDndBase = z.object({
  id: z.string(),
  name: z.string(),
});

export const zDndTheme = z.enum(["Parchment", "Ink", "Minimal"]);

/**
 * Minimal schema for non-player characters (NPCs).
 * Designed to keep downstream consumers consistent and predictable.
 */
export const zVoice = z.object({
  style: z.string(),
  provider: z.string(),
  preset: z.string(),
});

export const zNpc = z.object({
  id: z.string(),
  name: z.string(),
  species: z.string(),
  role: z.string(),
  alignment: z.string(),
  backstory: z.string().optional(),
  location: z.string().optional(),
  hooks: z.array(z.string()),
  quirks: z.array(z.string()).optional(),
  voice: zVoice,
  portrait: z.string().optional(),
  statblock: z.record(z.unknown()),
  tags: z.array(z.string()),
});

/**
 * Simple schema for world lore entries.
 */
export const zLore = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  location: z.string().optional(),
  hooks: z.array(z.string()).optional(),
  tags: z.array(z.string()),
});

export const zQuest = zDndBase.extend({
  tier: z.number(),
  summary: z.string(),
  beats: z.array(z.string()),
  rewards: z.object({
    gp: z.number().optional(),
    items: z.string().optional(),
    favors: z.string().optional(),
  }),
  complications: z.array(z.string()),
  theme: zDndTheme,
});

export const zEncounter = zDndBase.extend({
  level: z.number(),
  creatures: z.array(z.string()),
  tactics: z.string(),
  terrain: z.string(),
  treasure: z.string(),
  scaling: z.string(),
  theme: zDndTheme,
});

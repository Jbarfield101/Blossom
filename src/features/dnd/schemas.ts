import { z } from "zod";
import { zNpc } from "../../dnd/schemas/npc";

export const zDndBase = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const zDndTheme = z.enum(["Parchment", "Ink", "Minimal"]);

/**
 * Minimal schema for non-player characters (NPCs).
 * Designed to keep downstream consumers consistent and predictable.
 */
export { zNpc };

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
  tier: z.number().int().positive(),
  summary: z.string().min(1),
  beats: z.array(z.string()).nonempty(),
  rewards: z.object({
    gp: z.number().int().positive().optional(),
    items: z.string().optional(),
    favors: z.string().optional(),
  }),
  complications: z.array(z.string()).nonempty(),
  theme: zDndTheme,
});

export const zEncounter = zDndBase.extend({
  level: z.number().int().positive(),
  creatures: z.array(z.string()).nonempty(),
  tactics: z.string().min(1),
  terrain: z.string().min(1),
  treasure: z.string().min(1),
  scaling: z.string().min(1),
  theme: zDndTheme,
});

export const zRule = zDndBase.extend({
  description: z.string().min(1),
  tags: z.array(z.string()).nonempty(),
  sourceId: z.string().min(1).optional(),
  sections: z.record(z.string()).optional(),
});

export const zSpell = zDndBase.extend({
  level: z.number().int().nonnegative(),
  school: z.string().min(1),
  castingTime: z.string().min(1),
  range: z.string().min(1),
  components: z.array(z.string()).nonempty(),
  duration: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).nonempty(),
});

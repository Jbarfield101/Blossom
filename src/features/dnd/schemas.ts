import { z } from "zod";

export const zDndBase = z.object({
  id: z.string(),
  name: z.string(),
});

export const zDndTheme = z.enum(["Parchment", "Ink", "Minimal"]);

export const zNpc = zDndBase.extend({
  tags: z.array(z.string()),
  appearance: z.string(),
  personality: z.string(),
  motivation: z.string(),
  secret: z.string(),
  hooks: z.array(z.string()),
  stat_block_ref: z.string(),
  stat_overrides: z.string(),
  theme: zDndTheme,
});

export const zQuest = zDndBase.extend({
  tier: z.string(),
  summary: z.string(),
  beats: z.array(z.string()),
  rewards: z.object({
    gp: z.string().optional(),
    items: z.string().optional(),
    favors: z.string().optional(),
  }),
  complications: z.array(z.string()),
  theme: zDndTheme,
});

export const zEncounter = zDndBase.extend({
  level: z.string(),
  creatures: z.array(z.string()),
  tactics: z.string(),
  terrain: z.string(),
  treasure: z.string(),
  scaling: z.string(),
  theme: zDndTheme,
});

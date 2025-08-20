import { z } from "zod";

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

export type Npc = z.infer<typeof zNpc>;

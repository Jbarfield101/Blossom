import { z } from "zod";

export const zSpell = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().min(0).max(9),
  school: z.string().min(1),
  description: z.string().optional(),
});

export type Spell = z.infer<typeof zSpell>;

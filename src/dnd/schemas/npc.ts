import { z } from "zod";

export const npcSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  description: z.string().optional(),
  stats: z.record(z.number()).optional()
});

export type Npc = z.infer<typeof npcSchema>;

import { z } from "zod";

export const zTag = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
});

export type Tag = z.infer<typeof zTag>;

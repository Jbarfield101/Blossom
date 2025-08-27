import { z } from "zod";

export const zItem = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.number().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Item = z.infer<typeof zItem>;

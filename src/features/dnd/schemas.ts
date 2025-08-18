import { z } from "zod";

export const zDndBase = z.object({
  id: z.string(),
  name: z.string(),
});

export const zNpc = zDndBase;
export const zQuest = zDndBase;
export const zEncounter = zDndBase;

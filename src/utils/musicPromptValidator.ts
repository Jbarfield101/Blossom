import { MOODS, INSTR } from "./musicData";

export function validateMusicPrompt(input: string) {
  const lower = input.toLowerCase();
  const moods = MOODS.filter((m) => lower.includes(m));
  const instruments = INSTR.filter((i) => lower.includes(i));
  if (moods.length === 0) {
    return {
      canGenerate: false,
      message: `Missing mood. Available moods: ${MOODS.join(", ")}.`,
    } as const;
  }
  if (instruments.length === 0) {
    return {
      canGenerate: false,
      message: `Missing instrument. Available instruments: ${INSTR.join(", ")}.`,
    } as const;
  }
  return {
    canGenerate: true,
    message: `Moods: ${moods.join(", ")}\nInstruments: ${instruments.join(", ")}`,
  } as const;
}

import { create } from "zustand";
import { saveState, loadState } from "../utils/persist";

export interface Voice {
  id: string;
  provider: string;
  preset: string;
  tags: string[];
}

interface VoiceState {
  voices: Voice[];
  addVoice: (voice: Voice) => Promise<void>;
  removeVoice: (id: string) => Promise<void>;
  setTags: (id: string, tags: string[]) => Promise<void>;
  load: () => Promise<void>;
}

const STORAGE_KEY = "voices";

export const useVoices = create<VoiceState>((set, get) => ({
  voices: [],
  addVoice: async (voice) => {
    const existing = get().voices.filter((v) => v.id !== voice.id);
    const voices = [...existing, voice];
    set({ voices });
    await saveState(STORAGE_KEY, voices);
  },
  removeVoice: async (id) => {
    const voices = get().voices.filter((v) => v.id !== id);
    set({ voices });
    await saveState(STORAGE_KEY, voices);
  },
  setTags: async (id, tags) => {
    const voices = get().voices.map((v) => (v.id === id ? { ...v, tags } : v));
    set({ voices });
    await saveState(STORAGE_KEY, voices);
  },
  load: async () => {
    const voices = await loadState<Voice[]>(STORAGE_KEY);
    if (voices) set({ voices });
  },
}));

loadState<Voice[]>(STORAGE_KEY).then((voices) => {
  if (voices) useVoices.setState({ voices }, true);
});

export type { VoiceState };

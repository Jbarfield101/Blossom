import { create } from "zustand";
import { saveState, loadState } from "../utils/persist";
import { fetchVoices as fetchBarkPresets } from "../features/voice/fetchVoices";

export interface Voice {
  id: string;
  provider: string;
  preset: string;
  tags: string[];
  favorite: boolean;
}

interface VoiceState {
  voices: Voice[];
  filter: (v: Voice) => boolean;
  fetchVoices: () => Promise<void>;
  addVoice: (voice: Voice) => Promise<void>;
  removeVoice: (id: string) => Promise<void>;
  setTags: (id: string, tags: string[]) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setFilter: (fn: (v: Voice) => boolean) => void;
  load: () => Promise<void>;
}

const STORAGE_KEY = "voices";

export const useVoices = create<VoiceState>((set, get) => ({
  voices: [],
  filter: () => true,
  fetchVoices: async () => {
    const presets = await fetchBarkPresets();
    const voices = presets.map((preset) => ({
      id: `bark-${preset}`,
      provider: "bark",
      preset,
      tags: [],
      favorite: false,
    }));
    set({ voices });
    await saveState(STORAGE_KEY, voices);
  },
  addVoice: async (voice) => {
    const withFavorite: Voice = { favorite: false, ...voice };
    const existing = get().voices.filter((v) => v.id !== withFavorite.id);
    const voices = [...existing, withFavorite];
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
  toggleFavorite: async (id) => {
    const voices = get().voices.map((v) =>
      v.id === id ? { ...v, favorite: !v.favorite } : v
    );
    set({ voices });
    await saveState(STORAGE_KEY, voices);
  },
  setFilter: (fn) => set({ filter: fn }),
  load: async () => {
    const voices = await loadState<Voice[]>(STORAGE_KEY);
    if (voices && voices.length) {
      set({ voices: voices.map((v) => ({ favorite: false, ...v })) });
    } else if (process.env.NODE_ENV !== "test") {
      await get().fetchVoices();
    }
  },
}));



export type { VoiceState };

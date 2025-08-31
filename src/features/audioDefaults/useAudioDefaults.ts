import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioDefaultsState {
  bpm: number;
  key: string;
  hqStereo: boolean;
  hqReverb: boolean;
  hqSidechain: boolean;
  hqChorus: boolean;
  micEnabled: boolean;
  setBpm: (bpm: number) => void;
  setKey: (key: string) => void;
  toggleHqStereo: () => void;
  toggleHqReverb: () => void;
  toggleHqSidechain: () => void;
  toggleHqChorus: () => void;
  toggleMicEnabled: () => void;
}

export const useAudioDefaults = create<AudioDefaultsState>()(
  persist(
    (set) => ({
      bpm: 80,
      key: "Auto",
      hqStereo: true,
      hqReverb: true,
      hqSidechain: true,
      hqChorus: true,
      micEnabled: true,
      setBpm: (bpm: number) => set({ bpm }),
      setKey: (key: string) => set({ key }),
      toggleHqStereo: () => set((s) => ({ hqStereo: !s.hqStereo })),
      toggleHqReverb: () => set((s) => ({ hqReverb: !s.hqReverb })),
      toggleHqSidechain: () => set((s) => ({ hqSidechain: !s.hqSidechain })),
      toggleHqChorus: () => set((s) => ({ hqChorus: !s.hqChorus })),
      toggleMicEnabled: () => set((s) => ({ micEnabled: !s.micEnabled })),
    }),
    { name: "audio-defaults" }
  )
);

export type { AudioDefaultsState };

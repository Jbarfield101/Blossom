import { create } from "zustand";
import { persist } from "zustand/middleware";
import { presetCatalog, type Preset } from "./presets";

interface AudioDefaultsState {
  bpm: number;
  key: string;
  hqStereo: boolean;
  hqReverb: boolean;
  hqSidechain: boolean;
  hqChorus: boolean;
  micEnabled: boolean;
  currentPreset: string | null;
  customPresets: Record<string, Preset>;
  setBpm: (bpm: number) => void;
  setKey: (key: string) => void;
  toggleHqStereo: () => void;
  toggleHqReverb: () => void;
  toggleHqSidechain: () => void;
  toggleHqChorus: () => void;
  toggleMicEnabled: () => void;
  setPreset: (name: string) => void;
  savePreset: (name: string) => void;
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
      currentPreset: "default",
      customPresets: {},
      setBpm: (bpm: number) => set({ bpm }),
      setKey: (key: string) => set({ key }),
      toggleHqStereo: () => set((s) => ({ hqStereo: !s.hqStereo })),
      toggleHqReverb: () => set((s) => ({ hqReverb: !s.hqReverb })),
      toggleHqSidechain: () => set((s) => ({ hqSidechain: !s.hqSidechain })),
      toggleHqChorus: () => set((s) => ({ hqChorus: !s.hqChorus })),
      toggleMicEnabled: () => set((s) => ({ micEnabled: !s.micEnabled })),
      setPreset: (name: string) =>
        set((s) => {
          const preset = presetCatalog[name] ?? s.customPresets[name];
          if (!preset) return s;
          return { ...s, ...preset, currentPreset: name };
        }),
      savePreset: (name: string) =>
        set((s) => ({
          customPresets: {
            ...s.customPresets,
            [name]: {
              bpm: s.bpm,
              key: s.key,
              hqStereo: s.hqStereo,
              hqReverb: s.hqReverb,
              hqSidechain: s.hqSidechain,
              hqChorus: s.hqChorus,
              micEnabled: s.micEnabled,
            },
          },
          currentPreset: name,
        })),
    }),
    { name: "audio-defaults" }
  )
);

export type { AudioDefaultsState };

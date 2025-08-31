import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MusicModel = 'musicgen-small' | 'musicgen-medium';
export type DiffusionType = 'none' | 'latent-spec' | 'ddim';

interface MusicSettingsState {
  model: MusicModel;
  diffusion: DiffusionType;
  sampleRate: 32000 | 44100 | 48000;
  setModel: (m: MusicModel) => void;
  setDiffusion: (d: DiffusionType) => void;
  setSampleRate: (s: 32000 | 44100 | 48000) => void;
}

export const useMusicSettings = create<MusicSettingsState>()(
  persist(
    (set) => ({
      model: 'musicgen-small',
      diffusion: 'none',
      sampleRate: 44100,
      setModel: (model) => set({ model }),
      setDiffusion: (diffusion) => set({ diffusion }),
      setSampleRate: (sampleRate) => set({ sampleRate }),
    }),
    { name: 'music-settings' }
  )
);


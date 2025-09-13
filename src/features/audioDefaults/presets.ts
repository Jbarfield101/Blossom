export interface Preset {
  bpm: number;
  key: string;
  hqStereo: boolean;
  hqReverb: boolean;
  hqSidechain: boolean;
  hqChorus: boolean;
  micEnabled: boolean;
}

export const presetCatalog: Record<string, Preset> = {
  default: {
    bpm: 80,
    key: "Auto",
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    micEnabled: true,
  },
  podcast: {
    bpm: 80,
    key: "Auto",
    hqStereo: false,
    hqReverb: false,
    hqSidechain: false,
    hqChorus: false,
    micEnabled: true,
  },
  lofi: {
    bpm: 60,
    key: "Auto",
    hqStereo: true,
    hqReverb: true,
    hqSidechain: false,
    hqChorus: true,
    micEnabled: true,
  },
};

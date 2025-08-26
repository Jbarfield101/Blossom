export type WeatherPreset = 'sunny' | 'rain' | 'snow';

export type LofiState = {
  isPlaying: boolean;
  bpm: number;
  seed: number;
  key: string;
  weatherPreset: WeatherPreset | null;
  weatherEnabled: boolean;
  sfzInstrument?: string;
};

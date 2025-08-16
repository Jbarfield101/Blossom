export type LofiState = {
  isPlaying: boolean;
  bpm: number;
  seed: number;
  key: string;
  /** Optional set of progressions to pick from */
  patterns?: (number | string)[][];
  /** Optional generator returning a set of progressions */
  patternGenerator?: (seed: number, key: string) => (number | string)[][];
  /** How to traverse progressions */
  patternMode?: 'random' | 'cycle';
};

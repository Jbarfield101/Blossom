import { create } from 'zustand';
import * as Tone from 'tone';
import type { LofiState } from './types';

// small deterministic PRNG for pattern variation
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let initialized = false;
let loop: Tone.Loop | null = null;
let chain: {
  lead: Tone.MonoSynth;
  bass: Tone.MonoSynth;
  hat: Tone.NoiseSynth;
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  pad: Tone.PolySynth;
  rev: Tone.Reverb;
} | null = null;

let melody: string[] = [];
let bassLine: string[] = [];
let step = 0;
let bassStep = 0;
let chordStep = 0;

let chords: string[][] = [];

type ChordType = 'maj7' | 'min7' | 'dom7';
type Degree = number | `b${number}` | `#${number}`;

export function buildChord(root: string, type: ChordType) {
  const intervals =
    type === 'maj7'
      ? [0, 4, 7, 11, 14]
      : type === 'min7'
        ? [0, 3, 7, 10, 14]
        : [0, 4, 7, 10, 14];
  return intervals.map((i) => Tone.Frequency(root).transpose(i).toNote());
}

let patternIndex = 0;
const progressionPatterns: Degree[][] = [
  [1, 4, 6, 5],
  [2, 5, 1, 6],
  [1, 5, 4, 5],
  [2, 5, 1, 4],
  [6, 2, 5, 1],
  // minor key progressions
  [1, 4, 5, 4],
  [1, 6, 7, 6],
  [1, 3, 4, 6],
  // modal interchange examples
  [1, 'b7', 4, 'b7'],
  [1, 'b6', 'b7', 4],
  // longer sequences
  [1, 4, 6, 5, 3, 4, 1, 5],
  [1, 5, 6, 3, 4, 1],
];

export function chordFromDegree(degree: Degree, key: string): string[] {
  const isMinor = key.toLowerCase().endsWith('m');
  const baseKey = isMinor ? key.slice(0, -1) : key;
  let accidental = 0;
  let degNum: number;
  if (typeof degree === 'string') {
    if (degree.startsWith('b')) {
      accidental = -1;
      degNum = parseInt(degree.slice(1), 10);
    } else if (degree.startsWith('#')) {
      accidental = 1;
      degNum = parseInt(degree.slice(1), 10);
    } else {
      degNum = parseInt(degree, 10);
    }
  } else {
    degNum = degree;
  }
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  const scale = isMinor ? minorScale : majorScale;
  const root = Tone.Frequency(`${baseKey}4`)
    .transpose(scale[degNum - 1] + accidental)
    .toNote();
  let type: ChordType;
  if (isMinor) {
    switch (degNum) {
      case 1:
      case 4:
        type = 'min7';
        break;
      case 5:
        type = 'dom7';
        break;
      case 3:
      case 6:
      case 7:
        type = 'maj7';
        break;
      default:
        type = 'min7';
        break;
    }
  } else {
    switch (degNum) {
      case 1:
      case 4:
        type = 'maj7';
        break;
      case 5:
        type = 'dom7';
        break;
      default:
        type = 'min7';
        break;
    }
    if (accidental === -1 && [3, 6, 7].includes(degNum)) {
      type = 'maj7';
    }
  }
  return buildChord(root, type);
}

function rotate(arr: number[], n: number) {
  return arr.slice(n).concat(arr.slice(0, n).map((v) => v + 12));
}

export function voiceLeadChords(chs: string[][]): string[][] {
  if (chs.length === 0) return [];
  const voiced: string[][] = [chs[0]];
  for (let i = 1; i < chs.length; i++) {
    const prevRoot = Tone.Frequency(voiced[i - 1][0]).toMidi();
    const chordMidi = chs[i].map((n) => Tone.Frequency(n).toMidi());
    let best = chordMidi;
    let min = Infinity;
    for (let inv = 0; inv < chordMidi.length; inv++) {
      const rotated = rotate(chordMidi, inv);
      const shift = Math.round((prevRoot - rotated[0]) / 12) * 12;
      const shifted = rotated.map((v) => v + shift);
      const dist = Math.abs(shifted[0] - prevRoot);
      if (dist < min) {
        min = dist;
        best = shifted;
      }
    }
    voiced.push(best.map((m) => Tone.Frequency(m, 'midi').toNote()));
  }
  return voiced;
}

function generateProgression(
  seed: number,
  key: string,
  patterns?: Degree[][],
  mode: 'random' | 'cycle' = 'random',
) {
  const list = patterns && patterns.length > 0 ? patterns : progressionPatterns;
  let pattern: Degree[];
  if (mode === 'cycle') {
    pattern = list[patternIndex % list.length];
    patternIndex++;
  } else {
    const rnd = mulberry32(seed);
    pattern = list[Math.floor(rnd() * list.length)];
  }
  chords = voiceLeadChords(pattern.map((deg) => chordFromDegree(deg, key)));
}

function makePattern(
  seed: number,
  key: string,
  patterns?: Degree[][],
  mode: 'random' | 'cycle' = 'random',
) {
  const rnd = mulberry32(seed);
  generateProgression(seed, key, patterns, mode);
  melody = [];
  chords.forEach((ch) => {
    for (let i = 0; i < 4; i++) {
      melody.push(ch[Math.floor(rnd() * ch.length)]);
    }
  });
  bassLine = chords.map((ch) => Tone.Frequency(ch[0]).transpose(-12).toNote());
  step = 0;
  bassStep = 0;
  chordStep = 0;
}

function init() {
  if (initialized) return;
  const rev = new Tone.Reverb({ decay: 3, wet: 0.25 }).toDestination();

  const lead = new Tone.MonoSynth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1.2 },
  }).connect(rev);

  const bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', frequency: 200 },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.0 },
  }).connect(rev);

  const hat = new Tone.NoiseSynth({
    envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
  });
  const hatVol = new Tone.Volume(-12).connect(rev);
  hat.connect(hatVol);

  const kick = new Tone.MembraneSynth().connect(rev);
  const snare = new Tone.NoiseSynth({
    envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
  }).connect(rev);

  const padFilter = new Tone.Filter({ type: 'lowpass', frequency: 500 }).connect(rev);
  const pad = new Tone.PolySynth(Tone.Synth).connect(padFilter);

  chain = { lead, bass, hat, kick, snare, pad, rev };
  Tone.Transport.bpm.value = 80;

  loop = new Tone.Loop((time) => {
    if (!chain) return;
    if (melody.length === 0) return;
    const note = melody[step % melody.length];
    chain.lead.triggerAttackRelease(note, '8n', time);
    if (step % 2 === 0) {
      chain.hat.triggerAttackRelease('16n', time);
    }
    if (step % 4 === 0 || step % 4 === 2) {
      chain.kick.triggerAttackRelease('C2', '8n', time);
    }
    if (step % 4 === 1 || step % 4 === 3) {
      chain.snare.triggerAttackRelease('16n', time);
    }
    if (step % 4 === 0) {
      const b = bassLine[bassStep % bassLine.length];
      chain.bass.triggerAttackRelease(b, '2n', time);
      const chord = chords[chordStep % chords.length];
      chain.pad.triggerAttackRelease(chord, '1m', time);
      bassStep++;
      chordStep++;
    }
    step++;
  }, '4n');

  initialized = true;
}

type Actions = {
  play: () => Promise<void>;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setSeed: (seed: number) => void;
  setKey: (key: string) => void;
  setPatterns: (patterns: Degree[][]) => void;
  setPatternGenerator: (fn: (seed: number, key: string) => Degree[][]) => void;
  setPatternMode: (mode: 'random' | 'cycle') => void;
};

export const useLofi = create<LofiState & Actions>((set, get) => ({
  isPlaying: false,
  bpm: 80,
  seed: 0,
  key: 'C',
  patterns: undefined,
  patternGenerator: undefined,
  patternMode: 'random',

  play: async () => {
    init();
    const s = get().seed || Math.floor(Math.random() * 1_000_000);
    const patts = get().patterns || get().patternGenerator?.(s, get().key);
    makePattern(s, get().key, patts, get().patternMode);
    set({ seed: s });
    await Tone.start();
    loop?.start(0);
    Tone.Transport.start();
    set({ isPlaying: true });
  },

  stop: () => {
    loop?.stop(0);
    Tone.Transport.stop();
    set({ isPlaying: false });
  },

  setBpm: (bpm) => {
    Tone.Transport.bpm.rampTo(bpm, 0.2);
    set({ bpm });
  },

  setSeed: (seed) => {
    const patts = get().patterns || get().patternGenerator?.(seed, get().key);
    makePattern(seed, get().key, patts, get().patternMode);
    set({ seed });
  },

  setKey: (key) => {
    const s = get().seed;
    const patts = get().patterns || get().patternGenerator?.(s, key);
    makePattern(s, key, patts, get().patternMode);
    set({ key });
  },

  setPatterns: (patterns) => set({ patterns }),
  setPatternGenerator: (patternGenerator) => set({ patternGenerator }),
  setPatternMode: (mode) => set({ patternMode: mode }),
}));

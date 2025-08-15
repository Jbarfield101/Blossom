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

const chords = [
  ['C4', 'E4', 'G4', 'B4'],
  ['F4', 'A4', 'C5', 'E5'],
  ['A3', 'C4', 'E4', 'G4'],
  ['G3', 'B3', 'D4', 'F4'],
];

function makePattern(seed: number) {
  const rnd = mulberry32(seed);
  const scale = ['C4', 'D#4', 'F4', 'G4', 'A#4'];
  melody = Array.from({ length: 8 }, () => scale[Math.floor(rnd() * scale.length)]);
  bassLine = melody.map((n) => Tone.Frequency(n).transpose(-12).toNote());
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
};

export const useLofi = create<LofiState & Actions>((set, get) => ({
  isPlaying: false,
  bpm: 80,
  seed: 0,

  play: async () => {
    init();
    const s = get().seed || Math.floor(Math.random() * 1_000_000);
    makePattern(s);
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
    makePattern(seed);
    set({ seed });
  },
}));

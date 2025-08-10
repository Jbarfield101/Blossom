import { create } from 'zustand';
import * as Tone from 'tone';
import type { LofiState } from './types';

let initialized = false;
let loop: Tone.Loop | null = null;
let chain: {
  synth: Tone.MonoSynth;
  bit: Tone.BitCrusher;
  filt: Tone.Filter;
  rev: Tone.Reverb;
} | null = null;

function init() {
  if (initialized) return;
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'triangle' },
    filter: { type: 'lowpass', frequency: 800 },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1.2 },
  });

  const bit = new Tone.BitCrusher(4);
  const filt = new Tone.Filter(1200, 'lowpass');
  const rev = new Tone.Reverb({ decay: 3, wet: 0.35 });

  synth.chain(bit, filt, rev, Tone.Destination);

  chain = { synth, bit, filt, rev };
  Tone.Transport.bpm.value = 80;

  // super-simple lo-fi pattern (we’ll evolve it)
  const notes = ['C4', 'G3', 'A#3', 'F3'];
  let i = 0;
  loop = new Tone.Loop((time) => {
    if (!chain) return;
    chain.synth.triggerAttackRelease(notes[i % notes.length], '8n', time);
    i++;
  }, '4n');

  initialized = true;
}

type Actions = {
  play: () => Promise<void>;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setSeed: (seed: number) => void; // placeholder we’ll use later
};

export const useLofi = create<LofiState & Actions>((set, get) => ({
  isPlaying: false,
  bpm: 80,
  seed: 0,

  play: async () => {
    init();
    await Tone.start(); // resumes audio context (important for desktop)
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

  setSeed: (seed) => set({ seed }), // we’ll hook this into pattern gen soon
}));

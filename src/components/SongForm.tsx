// src/components/SongForm.tsx — HQ wiring for lofi renderer
import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLofi } from "../features/lofi/SongForm";
import Waveform from "./Waveform";
import { FaQuestionCircle } from "react-icons/fa";

const HelpIcon = ({ text }: { text: string }) => (
  <FaQuestionCircle
    title={text}
    style={{ marginLeft: 4, cursor: "help", opacity: 0.6 }}
  />
);

type Section = { name: string; bars: number; chords: string[]; barsStr?: string };

type SongSpec = {
  title: string;
  outDir: string;
  bpm: number;
  key: string | { key: string; mode: string }; // support minor mode
  structure?: Section[];
  form?: string;
  mood: string[];
  instruments: string[];
  lead_instrument?: string;
  ambience: string[];
  ambience_level: number; // 0..1
  seed: number;
  variety: number; // 0..100
  chord_span_beats?: number;
  drum_pattern?: string;
  // NEW HQ feature flags (read by lofi/renderer.py)
  hq_stereo?: boolean;
  hq_reverb?: boolean;
  hq_sidechain?: boolean;
  hq_chorus?: boolean;
  limiter_drive?: number;
  dither_amount?: number;
};

type TemplateSpec = {
  structure: Section[];
  bpm: number;
  key: string;
  mood: string[];
  instruments: string[];
  ambience: string[];
  ambienceLevel?: number;
  leadInstrument?: string;
  drumPattern: string;
  variety: number;
  chordSpanBeats?: number;
  hqStereo: boolean;
  hqReverb: boolean;
  hqSidechain: boolean;
  hqChorus: boolean;
  limiterDrive: number;
  dither: boolean;
  bpmJitterPct: number;
};

type Job = {
  id: string;
  title: string;
  spec: SongSpec;
  status: string;
  outPath?: string;
  error?: string;
  progress?: number;
};

const KEYS_BASE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const EXTRA_KEYS = ["Db", "Eb", "Gb", "Ab", "Bb", "Am", "Em", "Dm"];
const KEYS = ["Auto", ...KEYS_BASE, ...EXTRA_KEYS];
const displayKey = (k: string) => k.replace("#", "♯").replace("b", "♭");
const showKey = (k: SongSpec["key"]) =>
  typeof k === "string" ? displayKey(k) : displayKey(k.key + (k.mode === "minor" ? "m" : ""));
const MOODS = ["calm", "melancholy", "cozy", "nostalgic", "fantasy", "dreamy"];
const INSTR = [
  "rhodes",
  "nylon guitar",
  "upright bass",
  "pads",
  "electric piano",
  "piano",
  "clean electric guitar",
  "airy pads",
  "vinyl sounds",
  "acoustic guitar",
  "violin",
  "cello",
  "flute",
  "saxophone",
  "trumpet",
  "synth lead",
  "string squeaks",
  "key clicks",
  "breath noise",
  "harp",
  "lute",
  "pan flute",
  "brush kit",
  "shaker",
  "tambourine",
  "808 sub-kick",
  "wurlitzer",
  "celesta",
  "music box",
  "glockenspiel",
  "vibraphone",
  "marimba",
  "muted electric guitar",
  "muted trumpet",
  "clarinet",
  "oboe",
  "field recordings",
  "synth plucks",
  "timpani",
  "pipe organ",
  "choir",
];
const AMBI = [
  "rain",
  "cafe",
  "street",
  "birds",
  "cicadas",
  "train",
  "vinyl",
  "forest",
  "fireplace",
  "ocean",
];
const LEAD_INSTR = [
  { value: "flute", label: "flute" },
  { value: "saxophone", label: "sax" },
  { value: "synth lead", label: "synth" },
  { value: "violin", label: "violin" },
  { value: "clarinet", label: "clarinet" },
  { value: "oboe", label: "oboe" },
  { value: "muted trumpet", label: "muted trumpet" },
  { value: "glockenspiel", label: "glockenspiel" },
];
const DRUM_PATS = [
  "random",
  "no_drums",
  "boom_bap_A",
  "boom_bap_B",
  "laidback",
  "half_time",
  "swing",
  "half_time_shuffle",
  "bossa_nova",
];

function inferLeadInstrument(instrs: string[]): string {
  if (instrs.includes("flute")) return "flute";
  if (instrs.includes("saxophone")) return "saxophone";
  if (instrs.includes("violin")) return "violin";
  if (instrs.includes("clarinet")) return "clarinet";
  if (instrs.includes("oboe")) return "oboe";
  if (instrs.includes("muted trumpet")) return "muted trumpet";
  if (instrs.includes("glockenspiel")) return "glockenspiel";
  if (instrs.includes("synth lead")) return "synth lead";
  return "synth lead";
}

const SECTION_PRESETS: Record<string, Section[]> = {
  "Intro(4)-A(8)-B(8)-Break(4)-A(8)-Outro(4)": [
    { name: "Intro", bars: 4, chords: [] },
    { name: "A", bars: 8, chords: [] },
    { name: "B", bars: 8, chords: [] },
    { name: "Break", bars: 4, chords: [] },
    { name: "A", bars: 8, chords: [] },
    { name: "Outro", bars: 4, chords: [] },
  ],
  "A(16)-B(16)-Outro(8)": [
    { name: "A", bars: 16, chords: [] },
    { name: "B", bars: 16, chords: [] },
    { name: "Outro", bars: 8, chords: [] },
  ],
  "A(8)x4": [
    { name: "A", bars: 8, chords: [] },
    { name: "A", bars: 8, chords: [] },
    { name: "A", bars: 8, chords: [] },
    { name: "A", bars: 8, chords: [] },
  ],
  "Intro(4)-A(8)-B(8)-C(8)-D(8)-E(8)-F(8)-Outro(4)": [
    { name: "Intro", bars: 4, chords: [] },
    { name: "A", bars: 8, chords: [] },
    { name: "B", bars: 8, chords: [] },
    { name: "C", bars: 8, chords: [] },
    { name: "D", bars: 8, chords: [] },
    { name: "E", bars: 8, chords: [] },
    { name: "F", bars: 8, chords: [] },
    { name: "Outro", bars: 4, chords: [] },
  ],
  "Intro(4)-A(7)-B(5)-C(7)-D(5)-E(7)-F(5)-Outro(4)": [
    { name: "Intro", bars: 4, chords: [] },
    { name: "A", bars: 7, chords: [] },
    { name: "B", bars: 5, chords: [] },
    { name: "C", bars: 7, chords: [] },
    { name: "D", bars: 5, chords: [] },
    { name: "E", bars: 7, chords: [] },
    { name: "F", bars: 5, chords: [] },
    { name: "Outro", bars: 4, chords: [] },
  ],
};
export const PRESET_TEMPLATES: Record<string, TemplateSpec> = {
  "Classic Lofi": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 80,
    key: "Auto",
    mood: ["calm", "cozy", "nostalgic"],
    instruments: ["rhodes", "nylon guitar", "upright bass"],
    ambience: ["rain"],
    drumPattern: "laidback",
    variety: 45,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.02,
    dither: true,
    bpmJitterPct: 5,
  },
  "Study Session": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "A", bars: 16, chords: [] },
      { name: "B", bars: 16, chords: [] },
      { name: "A", bars: 16, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "Outro", bars: 2, chords: [] },
    ],
    bpm: 75,
    key: "C",
    mood: ["calm", "cozy"],
    instruments: ["electric piano", "upright bass", "pads"],
    ambience: ["cafe"],
    drumPattern: "boom_bap_A",
    variety: 30,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.01,
    dither: true,
    bpmJitterPct: 3,
  },
  "Jazz Cafe": {
    structure: [
      { name: "Intro", bars: 8, chords: [] },
      { name: "A", bars: 12, chords: [] },
      { name: "B", bars: 12, chords: [] },
      { name: "Solo", bars: 8, chords: [] },
      { name: "A", bars: 12, chords: [] },
      { name: "Outro", bars: 8, chords: [] },
    ],
    bpm: 90,
    key: "F",
    mood: ["cozy", "nostalgic"],
    instruments: ["piano", "upright bass", "pads"],
    ambience: ["cafe"],
    drumPattern: "swing",
    variety: 20,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.0,
    dither: true,
    bpmJitterPct: 2,
  },
  "Midnight Drive": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "Verse", bars: 16, chords: [] },
      { name: "Chorus", bars: 8, chords: [] },
      { name: "Verse", bars: 16, chords: [] },
      { name: "Chorus", bars: 8, chords: [] },
      { name: "Bridge", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 85,
    key: "D",
    mood: ["melancholy", "nostalgic"],
    instruments: ["clean electric guitar", "upright bass", "pads"],
    ambience: ["rain"],
    drumPattern: "half_time",
    variety: 50,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.2,
    dither: true,
    bpmJitterPct: 4,
  },
  "Rain & Coffee": {
    structure: [
      { name: "Ambient", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 12, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Ambient", bars: 4, chords: [] },
    ],
    bpm: 72,
    key: "G",
    mood: ["calm", "nostalgic"],
    instruments: ["rhodes", "piano", "pads"],
    ambience: ["rain", "cafe"],
    drumPattern: "laidback",
    variety: 40,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 6,
  },
  "Bossa Nova": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 16, chords: [] },
      { name: "B", bars: 16, chords: [] },
      { name: "A", bars: 16, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 120,
    key: "Auto",
    mood: ["calm", "cozy"],
    instruments: ["nylon guitar", "upright bass", "piano"],
    ambience: ["cafe"],
    drumPattern: "bossa_nova",
    variety: 35,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 3,
  },
  "Quick Beat": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "A", bars: 4, chords: [] },
      { name: "B", bars: 4, chords: [] },
      { name: "Outro", bars: 2, chords: [] },
    ],
    bpm: 92,
    key: "A",
    mood: ["cozy"],
    instruments: ["rhodes", "upright bass"],
    ambience: ["cafe"],
    drumPattern: "boom_bap_B",
    variety: 60,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: false,
    limiterDrive: 1.1,
    dither: true,
    bpmJitterPct: 8,
  },
  "New Fantasy": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 78,
    key: "E",
    mood: ["fantasy", "nostalgic", "melancholy"],
    instruments: ["flute", "piano", "upright bass"],
    ambience: ["rain"],
    drumPattern: "swing",
    variety: 35,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 4,
  },
  "Sleep": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 12, chords: [] },
      { name: "B", bars: 12, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 60,
    key: "Auto",
    mood: ["calm", "cozy"],
    instruments: ["piano", "pads", "upright bass"],
    ambience: ["rain"],
    drumPattern: "no_drums",
    variety: 15,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: false,
    limiterDrive: 0.98,
    dither: true,
    bpmJitterPct: 2,
  },
  "Sunset Sketches": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Break", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 82,
    key: "Auto",
    mood: ["calm", "nostalgic", "cozy"],
    instruments: ["rhodes", "upright bass", "pads"],
    ambience: ["rain"],
    leadInstrument: "synth lead",
    drumPattern: "boom_bap_A",
    variety: 38,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.04,
    dither: true,
    bpmJitterPct: 4,
  },
  "Neon Rain": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "Verse", bars: 16, chords: [] },
      { name: "Chorus", bars: 8, chords: [] },
      { name: "Verse", bars: 16, chords: [] },
      { name: "Chorus", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 88,
    key: "Em",
    mood: ["melancholy", "nostalgic"],
    instruments: ["electric piano", "upright bass", "airy pads"],
    ambience: ["rain", "street"],
    leadInstrument: "saxophone",
    drumPattern: "half_time",
    variety: 52,
    chordSpanBeats: 8,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.12,
    dither: true,
    bpmJitterPct: 6,
  },
  "Loft Morning": {
    structure: [
      { name: "Ambient", bars: 4, chords: [] },
      { name: "A", bars: 12, chords: [] },
      { name: "A", bars: 12, chords: [] },
      { name: "B", bars: 12, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 70,
    key: "G",
    mood: ["calm", "cozy"],
    instruments: ["piano", "upright bass", "pads"],
    ambience: ["cafe"],
    leadInstrument: "flute",
    drumPattern: "laidback",
    variety: 22,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: false,
    limiterDrive: 1.0,
    dither: true,
    bpmJitterPct: 3,
  },
  "Late Night Coding": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "Outro", bars: 2, chords: [] },
    ],
    bpm: 92,
    key: "D",
    mood: ["cozy"],
    instruments: ["clean electric guitar", "upright bass", "pads"],
    ambience: ["cafe"],
    leadInstrument: "synth lead",
    drumPattern: "boom_bap_B",
    variety: 58,
    chordSpanBeats: 2,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.08,
    dither: true,
    bpmJitterPct: 7,
  },
  "Forest Spirits": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Ambient", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 76,
    key: "C",
    mood: ["fantasy", "nostalgic", "calm"],
    instruments: ["harp", "piano", "upright bass", "airy pads"],
    ambience: ["rain", "street"],
    leadInstrument: "flute",
    drumPattern: "swing",
    variety: 34,
    chordSpanBeats: 8,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.03,
    dither: true,
    bpmJitterPct: 5,
  },
  "Linear Drift": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "D", bars: 8, chords: [] },
      { name: "E", bars: 8, chords: [] },
      { name: "F", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 82,
    key: "Auto",
    mood: ["calm", "nostalgic"],
    instruments: ["rhodes", "upright bass", "pads"],
    ambience: ["rain"],
    drumPattern: "laidback",
    variety: 42,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.0,
    dither: true,
    bpmJitterPct: 4,
  },
  "Odd Odyssey": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 7, chords: [] },
      { name: "B", bars: 5, chords: [] },
      { name: "C", bars: 7, chords: [] },
      { name: "D", bars: 5, chords: [] },
      { name: "E", bars: 7, chords: [] },
      { name: "F", bars: 5, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 78,
    key: "Auto",
    mood: ["cozy", "nostalgic"],
    instruments: ["piano", "upright bass", "pads"],
    ambience: ["street"],
    drumPattern: "swing",
    variety: 45,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 5,
  },
  "Arcane Clash": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 2, chords: [] },
    ],
    bpm: 110,
    key: "Dm",
    mood: ["fantasy", "melancholy"],
    instruments: ["violin", "cello", "trumpet", "timpani"],
    ambience: ["forest"],
    leadInstrument: "violin",
    drumPattern: "half_time",
    variety: 70,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.15,
    dither: true,
    bpmJitterPct: 3,
  },
  "King's Last Stand": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Boss", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 96,
    key: "Em",
    mood: ["fantasy", "melancholy"],
    instruments: ["pipe organ", "violin", "cello", "trumpet", "timpani", "choir"],
    ambience: ["forest"],
    leadInstrument: "trumpet",
    drumPattern: "half_time",
    variety: 60,
    chordSpanBeats: 8,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.2,
    dither: true,
    bpmJitterPct: 5,
  },
  "Ocean Breeze": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 72,
    key: "G",
    mood: ["calm", "nostalgic", "cozy"],
    instruments: ["acoustic guitar", "piano", "upright bass", "airy pads"],
    ambience: ["ocean"],
    leadInstrument: "flute",
    drumPattern: "laidback",
    variety: 30,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.0,
    dither: true,
    bpmJitterPct: 3,
  },
  "City Lights": {
    structure: [
      { name: "Intro", bars: 2, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "C", bars: 8, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 2, chords: [] },
    ],
    bpm: 92,
    key: "F#",
    mood: ["cozy", "nostalgic"],
    instruments: ["electric piano", "upright bass", "synth lead", "shaker"],
    ambience: ["street", "rain"],
    leadInstrument: "saxophone",
    drumPattern: "half_time",
    variety: 55,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.1,
    dither: true,
    bpmJitterPct: 6,
  },
  "Starlit Voyage": {
    structure: [
      { name: "Intro", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "B", bars: 8, chords: [] },
      { name: "Ambient", bars: 4, chords: [] },
      { name: "A", bars: 8, chords: [] },
      { name: "Outro", bars: 4, chords: [] },
    ],
    bpm: 80,
    key: "C#",
    mood: ["calm", "melancholy"],
    instruments: ["synth lead", "pads", "upright bass", "shaker"],
    ambience: ["vinyl"],
    leadInstrument: "synth lead",
    drumPattern: "half_time",
    variety: 40,
    chordSpanBeats: 8,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 4,
  },
  "Sunset VHS": {
    structure: [
      { name: "Intro", bars: 4, chords: ["Am7", "Am7", "Am7", "Am7"] },
      {
        name: "A",
        bars: 8,
        chords: ["Am7", "Gmaj7", "Fmaj7", "E7", "Am7", "Gmaj7", "Fmaj7", "E7"],
      },
      {
        name: "B",
        bars: 8,
        chords: ["Dm7", "G7", "Cmaj7", "Fmaj7", "Bm7b5", "E7", "Am7", "Am7"],
      },
      {
        name: "A",
        bars: 8,
        chords: ["Am7", "Gmaj7", "Fmaj7", "E7", "Am7", "Gmaj7", "Fmaj7", "E7"],
      },
      { name: "Outro", bars: 4, chords: ["Fmaj7", "E7", "Am7", "Am7"] },
    ],
    bpm: 90,
    key: "Am",
    mood: ["nostalgic", "dreamy"],
    instruments: ["wurlitzer", "upright bass", "pads", "synth lead"],
    ambience: ["vinyl"],
    ambienceLevel: 0.35,
    drumPattern: "laidback",
    variety: 45,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 5,
  },
  "Neon Palms": {
    structure: [
      { name: "Intro", bars: 4, chords: ["F#m7", "F#m7", "F#m7", "F#m7"] },
      {
        name: "A",
        bars: 8,
        chords: ["F#m7", "Dmaj7", "E7", "C#m7", "F#m7", "Dmaj7", "E7", "C#m7"],
      },
      {
        name: "B",
        bars: 8,
        chords: ["Amaj7", "B7", "G#m7", "C#7", "Amaj7", "B7", "G#m7", "C#7"],
      },
      {
        name: "A",
        bars: 8,
        chords: ["F#m7", "Dmaj7", "E7", "C#m7", "F#m7", "Dmaj7", "E7", "C#m7"],
      },
      { name: "Outro", bars: 4, chords: ["Dmaj7", "E7", "F#m7", "F#m7"] },
    ],
    bpm: 92,
    key: "F#m",
    mood: ["nostalgic", "dreamy"],
    instruments: ["wurlitzer", "upright bass", "pads", "synth lead"],
    ambience: ["vinyl"],
    ambienceLevel: 0.3,
    drumPattern: "boom_bap_B",
    variety: 50,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 5,
  },
  "Night Swim": {
    structure: [
      { name: "Intro", bars: 4, chords: ["Dm7", "Dm7", "Dm7", "Dm7"] },
      {
        name: "A",
        bars: 8,
        chords: ["Dm7", "Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7"],
      },
      {
        name: "B",
        bars: 8,
        chords: ["Bbmaj7", "A7", "Dm7", "Gm7", "Bbmaj7", "A7", "Dm7", "Gm7"],
      },
      {
        name: "A",
        bars: 8,
        chords: ["Dm7", "Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7"],
      },
      { name: "Outro", bars: 4, chords: ["Gm7", "A7", "Dm7", "Dm7"] },
    ],
    bpm: 84,
    key: "Dm",
    mood: ["nostalgic", "calm"],
    instruments: ["clean electric guitar", "upright bass", "pads", "synth lead"],
    ambience: ["vinyl"],
    ambienceLevel: 0.4,
    drumPattern: "half_time",
    variety: 40,
    chordSpanBeats: 4,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
    dither: true,
    bpmJitterPct: 5,
  },
};

const SONG_TEMPLATES = PRESET_TEMPLATES;

export default function SongForm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    bpm: defaultBpm,
    key: defaultKey,
    hqStereo: defaultHqStereo,
    hqReverb: defaultHqReverb,
    hqSidechain: defaultHqSidechain,
    hqChorus: defaultHqChorus,
  } = useAudioDefaults();

  // THEME (applies to all songs)
  const [titleBase, setTitleBase] = useState("Midnight Coffee");
  const [outDir, setOutDir] = useState(localStorage.getItem("outDir") ?? "");
  const [bpm, setBpm] = useState(defaultBpm);
  const [key, setKey] = useState<string>(defaultKey);
  const [mood, setMood] = useState<string[]>(["calm", "cozy", "nostalgic"]);
  const defaultInstruments = ["rhodes", "nylon guitar", "upright bass"];
  const [instruments, setInstruments] = useState<string[]>(defaultInstruments);
  const [leadInstrument, setLeadInstrument] = useState<string>(() =>
    inferLeadInstrument(defaultInstruments)
  );
  const [ambience, setAmbience] = useState<string[]>(["rain"]);
  const [ambienceLevel, setAmbienceLevel] = useState(0.5);
  const [templates, setTemplates] = useState<Record<string, TemplateSpec>>(() => {
    const stored = localStorage.getItem("songTemplates");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, TemplateSpec>;
        return { ...PRESET_TEMPLATES, ...parsed };
      } catch {
        return PRESET_TEMPLATES;
      }
    }
    return PRESET_TEMPLATES;
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sectionPreset, setSectionPreset] = useState<string>("");
  const [structure, setStructure] = useState<Section[]>(() =>
    PRESET_TEMPLATES["Classic Lofi"].structure.map((s) => ({ ...s, barsStr: String(s.bars) }))
  );
  const [newTemplateName, setNewTemplateName] = useState("");
  const [genTitleLoading, setGenTitleLoading] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  function applyTemplate(tpl: TemplateSpec) {
    setStructure(tpl.structure.map((s) => ({ ...s, barsStr: String(s.bars) })));
    setBpm(tpl.bpm);
    setKey(tpl.key);
    setMood(tpl.mood);
    setInstruments(tpl.instruments);
    setLeadInstrument(tpl.leadInstrument ?? inferLeadInstrument(tpl.instruments));
    setAmbience(tpl.ambience);
    setAmbienceLevel(tpl.ambienceLevel ?? 0.5);
    setDrumPattern(tpl.drumPattern);
    setVariety(tpl.variety);
    setChordSpanBeats(tpl.chordSpanBeats ?? 4);
    setHqStereo(tpl.hqStereo);
    setHqReverb(tpl.hqReverb);
    setHqSidechain(tpl.hqSidechain);
    setHqChorus(tpl.hqChorus);
    setLimiterDrive(tpl.limiterDrive);
    setDither(tpl.dither ?? true);
    setBpmJitterPct(tpl.bpmJitterPct);
  }

  useEffect(() => {
    const last = localStorage.getItem("lastSongTemplate");
    if (last && templates[last]) {
      setSelectedTemplate(last);
      applyTemplate(templates[last]);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem("lastSongTemplate", selectedTemplate);
    }
  }, [selectedTemplate]);

  // Album mode
  const [albumMode, setAlbumMode] = useState(false);
  const [trackCount, setTrackCount] = useState(6);

  // VARIATION / BATCH
  const [numSongs, setNumSongs] = useState(1);
  const [titleSuffixMode, setTitleSuffixMode] = useState<"number" | "timestamp">("number");
  const [seedBase, setSeedBase] = useState(12345);
  const [seedMode, setSeedMode] = useState<"increment" | "random">("random");
  const [autoKeyPerSong, setAutoKeyPerSong] = useState(false);
  const [bpmJitterPct, setBpmJitterPct] = useState(5);
  const [playLast, setPlayLast] = useState(true);
  const [drumPattern, setDrumPattern] = useState<string>("laidback");
  const [variety, setVariety] = useState(45);
  const [chordSpanBeats, setChordSpanBeats] = useState(4);

  // NEW: Mix polish toggles mapping to engine flags
  const [hqStereo, setHqStereo] = useState(defaultHqStereo);
  const [hqReverb, setHqReverb] = useState(defaultHqReverb);
  const [hqSidechain, setHqSidechain] = useState(defaultHqSidechain);
  const [hqChorus, setHqChorus] = useState(defaultHqChorus);
  const [limiterDrive, setLimiterDrive] = useState(() => {
    const stored = localStorage.getItem("limiterDrive");
    return stored ? Number(stored) : 1.02;
  });
  const [dither, setDither] = useState(() => {
    const stored = localStorage.getItem("dither");
    return stored === null ? true : stored === "true";
  });

  // UI state
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [globalStatus, setGlobalStatus] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const {
    isPlaying: previewPlaying,
    play: previewPlay,
    stop: previewStop,
    setBpm: setPreviewBpm,
    setKey: setPreviewKey,
    setSeed: setPreviewSeed,
  } = useLofi();

  // one audio element
  useEffect(() => {
    const a = new Audio();
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setErr("Audio playback error");
    a.addEventListener("ended", handleEnded);
    a.addEventListener("error", handleError);
    audioRef.current = a;
    return () => {
      a.removeEventListener("ended", handleEnded);
      a.removeEventListener("error", handleError);
      a.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("outDir", outDir);
    return () => {
      localStorage.setItem("outDir", outDir);
    };
  }, [outDir]);

  useEffect(() => {
    localStorage.setItem("limiterDrive", String(limiterDrive));
  }, [limiterDrive]);

  useEffect(() => {
    localStorage.setItem("dither", String(dither));
  }, [dither]);

  const runningJobId = useMemo(
    () => jobs.find((j) => !j.error && !j.outPath)?.id,
    [jobs]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await listen("lofi_progress", (e) => {
        try {
          const raw = typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload);
          let pretty = raw;
          let pct: number | undefined;
          try {
            const obj = JSON.parse(raw);
            if (obj && obj.stage && obj.message) {
              pretty = `${obj.stage}: ${obj.message}`;
              const map: Record<string, number> = { start: 10, generate: 60, post: 90, done: 100 };
              if (typeof obj.progress === "number") pct = obj.progress * 100;
              else if (map[obj.stage] !== undefined) pct = map[obj.stage];
            }
          } catch {}
          if (pct !== undefined) {
            setProgress(pct);
            if (runningJobId) {
              setJobs((prev) =>
                prev.map((j) => (j.id === runningJobId ? { ...j, progress: pct } : j))
              );
            }
          }
          if (runningJobId) {
            setJobs((prev) =>
              prev.map((j) => (j.id === runningJobId ? { ...j, status: pretty } : j))
            );
          } else {
            setGlobalStatus(pretty);
          }
          console.log("lofi_progress:", raw);
        } catch {}
      });
      unlisten = off;
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [runningJobId]);

  function toggle(list: string[], val: string) {
    return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
  }

  const hasInvalidBars = useMemo(
    () =>
      structure.some((s) => {
        const val = s.barsStr ?? String(s.bars);
        const n = parseInt(val, 10);
        return !(val && /^\d+$/.test(val) && n >= 1);
      }),
    [structure]
  );

  const totalBars = useMemo(
    () =>
      structure.reduce((sum, s) => {
        const val = s.barsStr ?? String(s.bars);
        const n = parseInt(val, 10);
        return Number.isFinite(n) && n >= 1 ? sum + n : sum;
      }, 0),
    [structure]
  );

  const estSeconds = useMemo(
    () => (bpm > 0 ? (totalBars * 4 * 60) / bpm : 0),
    [totalBars, bpm]
  );
  const estMinutes = Math.floor(estSeconds / 60);
  const estSecs = Math.floor(estSeconds % 60)
    .toString()
    .padStart(2, "0");

  async function pickFolder() {
    try {
      const dir = await open({ directory: true, multiple: false });
      if (dir) {
        setOutDir(dir as string);
        localStorage.setItem("outDir", dir as string);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function generateTitle() {
    try {
      setGenTitleLoading(true);
      await invoke("start_ollama");
      const reply: string = await invoke("general_chat", {
        messages: [
          {
            role: "system",
            content:
              "You are a creative assistant that suggests short, catchy lofi song titles. Respond with only the title.",
          },
          { role: "user", content: "Give me a lofi song title." },
        ],
      });
      const line = reply.split("\n")[0].replace(/^['\"]|['\"]$/g, "").trim();
      if (line) setTitleBase(line);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setGenTitleLoading(false);
    }
  }

  function buildTitle(i: number) {
    if (titleSuffixMode === "timestamp") {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      return `${titleBase} ${stamp}`;
    }
    return `${titleBase} ${i + 1}`;
  }

  function pickKey(i: number): string {
    if (key === "Auto") return "Auto";
    if (!autoKeyPerSong) return key;
    const idx = (i + Math.floor(seedBase % KEYS_BASE.length)) % KEYS_BASE.length;
    return KEYS_BASE[idx];
  }

  function jitterBpm(i: number): number {
    const pct = Math.max(0, Math.min(50, bpmJitterPct));
    if (pct === 0) return bpm;
    const rnd = mulberry32(seedBase + i)();
    const sign = rnd < 0.5 ? -1 : 1;
    const amount = Math.round(bpm * pct * 0.01 * (0.5 + Math.abs(rnd - 0.5)));
    return Math.max(40, Math.min(160, bpm + sign * amount));
  }

  function pickSeed(i: number): number {
    if (seedMode === "random") {
      return Math.floor(mulberry32(seedBase + i)() * 1_000_000_000);
    }
    return seedBase + i;
  }

  function formatSpecKey(k: string): string | { key: string; mode: string } {
    const norm = k.replace("♭", "b").replace("♯", "#");
    if (norm === "Auto") return "Auto";
    if (norm.endsWith("m")) return { key: norm.slice(0, -1), mode: "minor" };
    return norm;
  }

  function makeSpecForIndex(i: number): SongSpec {
    const amb = Math.max(0, Math.min(1, ambienceLevel));
    const varPct = Math.max(0, Math.min(100, variety));

    return {
      title: buildTitle(i),
      outDir,
      bpm: jitterBpm(i),
      key: formatSpecKey(pickKey(i)),
      structure: structure.map(({ name, bars, chords }) => ({ name, bars, chords })),
      mood,
      instruments,
      lead_instrument: leadInstrument,
      ambience,
      ambience_level: amb,
      seed: pickSeed(i),
      variety: varPct,
      chord_span_beats: chordSpanBeats,
      drum_pattern: drumPattern === "random" ? undefined : drumPattern,
      // pass-through HQ flags
      hq_stereo: hqStereo,
      hq_reverb: hqReverb,
      hq_sidechain: hqSidechain,
      hq_chorus: hqChorus,
      limiter_drive: Math.max(0.5, Math.min(2, limiterDrive)),
      dither_amount: dither ? 1 : 0,
    };
  }

  async function renderBatch() {
    setErr(null);
    setGlobalStatus("");
    setIsPlaying(false);
    setProgress(0);

    if (!titleBase || !outDir) {
      setErr("Please set a title and choose an output folder.");
      return;
    }
    if (numSongs < 1) {
      setErr("Number of songs must be at least 1.");
      return;
    }

    const newJobs: Job[] = Array.from({ length: numSongs }).map((_, i) => {
      const spec = makeSpecForIndex(i);
      const id = `${Date.now()}_${i}_${spec.seed}`;
      return { id, title: spec.title, spec, status: "queued" };
    });
    setJobs(newJobs);
    setBusy(true);

    try {
      for (let i = 0; i < newJobs.length; i++) {
        const job = newJobs[i];
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "starting…", progress: 0 } : j)));
        setProgress(0);
        try {
          const outPath = await invoke<string>("run_lofi_song", { spec: job.spec });
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, outPath, status: "done", progress: 100 } : j))
          );
          setProgress(100);
        } catch (e: any) {
          const message = e?.message || String(e);
          console.error("run_lofi_song failed:", e);
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: message, progress: 100 } : j))
          );
          setProgress(100);
        }
      }

      if (playLast) {
        const latestJobs = await getFreshJobs();
        const lastOut = [...latestJobs].reverse().find((j) => j.outPath)?.outPath;
        if (lastOut) {
          const url = convertFileSrc(lastOut.replace(/\\/g, "/"));
          const a = audioRef.current!;
          a.pause();
          a.src = url;
          a.load();
          await a.play();
          setIsPlaying(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function createAlbum() {
    setErr(null);
    setGlobalStatus("");
    setProgress(0);

    if (!titleBase || !outDir) {
      setErr("Please set a title and choose an output folder.");
      return;
    }

    try {
      setBusy(true);
      await invoke("generate_album", {
        meta: { track_count: trackCount, title_base: titleBase, out_dir: outDir },
      });
    } catch (e: any) {
      const message = e?.message || String(e);
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  async function getFreshJobs(): Promise<Job[]> {
    return new Promise((r) => setJobs((prev) => (r(prev), prev)));
  }

  const S: Record<string, React.CSSProperties> = {
    page: { position: "relative", minHeight: "100vh", background: "#0f0f10", color: "#fff", padding: 16 },
    card: { background: "#17181b", borderRadius: 16, padding: 16, boxShadow: "0 10px 24px rgba(0,0,0,.32)", color: "#fff", maxWidth: 1100, margin: "0 auto" },
    h1: { margin: "0 0 12px 0", fontSize: 22, fontWeight: 800 },
    row: { display: "flex", gap: 8, alignItems: "center" },
    input: { flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #2b2e33", background: "#0e0f12", color: "#e7e7ea" },
    btn: { padding: "10px 14px", borderRadius: 10, border: "none", background: "#3a82f6", color: "#fff", cursor: "pointer", minWidth: 140 },
    small: { fontSize: 12, opacity: 0.75, marginTop: 4 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 12 },
    grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 12 },
    panel: { background: "#0e0f12", borderRadius: 10, padding: 12 },
    label: { fontSize: 12, opacity: 0.8, marginBottom: 6, display: "block" },
    actions: { marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    status: { marginTop: 10, fontSize: 12, opacity: 0.8 },
    err: { marginTop: 8, color: "#ff7b7b", fontSize: 12 },
    table: { width: "100%", marginTop: 12, borderCollapse: "collapse", fontSize: 13 },
    th: { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #2b2e33", opacity: 0.8 },
    td: { padding: "8px 6px", borderBottom: "1px solid #1e2025" },
    optionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 8 },
    optionCard: { background: "#17191d", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    toggle: { display: "flex", gap: 8, alignItems: "center" },
    slider: { width: "100%" },
    playBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid #2b2e33", background: "transparent", color: "#e7e7ea", cursor: "pointer", minWidth: 120 },
    progressOuter: { height: 6, background: "#2b2e33", borderRadius: 3, overflow: "hidden", marginTop: 8 },
    progressInner: { height: "100%", background: "#3a82f6", width: "0%", transition: "width 0.3s" },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.h1}>Blossom — Song Builder (Batch + Vibes)</div>

        {/* template selector */}
        <div style={S.panel}>
          <label style={S.label}>
            Song Templates
            <HelpIcon text="Select a preset arrangement and settings" />
          </label>
          <select
            aria-label="Song Templates"
            value={selectedTemplate}
            onChange={(e) => {
              const templateName = e.target.value;
              setSelectedTemplate(templateName);
              if (templateName && SONG_TEMPLATES[templateName]) {
                applyTemplate(SONG_TEMPLATES[templateName]);
              }
            }}
            style={{ ...S.input, padding: "8px 12px" }}
          >
            <option value="">Custom Structure</option>
            <option value="Classic Lofi">Classic Lofi</option>
            <option value="Study Session">Study Session</option>
            <option value="Jazz Cafe">Jazz Cafe</option>
            <option value="Midnight Drive">Midnight Drive</option>
            <option value="Rain & Coffee">Rain & Coffee</option>
            <option value="Bossa Nova">Bossa Nova</option>
            <option value="Quick Beat">Quick Beat</option>
            <option value="Sunset Sketches">Sunset Sketches</option>
            <option value="Neon Rain">Neon Rain</option>
            <option value="Loft Morning">Loft Morning</option>
            <option value="Late Night Coding">Late Night Coding</option>
            <option value="Forest Spirits">Forest Spirits</option>
            <option value="Arcane Clash">Arcane Clash</option>
            <option value="King's Last Stand">King's Last Stand</option>
            <option value="Ocean Breeze">Ocean Breeze</option>
            <option value="City Lights">City Lights</option>
            <option value="Sunset VHS">Sunset VHS</option>
            <option value="Neon Palms">Neon Palms</option>
            <option value="Night Swim">Night Swim</option>
            <option value="Starlit Voyage">Starlit Voyage</option>
          </select>
        </div>

        {/* title + output folder */}
        <div style={S.row}>
          <input
            style={S.input}
            placeholder="Song title base"
            value={titleBase}
            onChange={(e) => setTitleBase(e.target.value)}
          />
          <button style={S.btn} onClick={generateTitle} disabled={genTitleLoading}>
            {genTitleLoading ? "Generating..." : "Generate Title"}
          </button>
          <button style={S.btn} onClick={pickFolder}>
            {outDir ? "Change folder" : "Choose folder"}
          </button>
        </div>
        <div style={S.small}>{outDir || "No output folder selected"}</div>

        {/* core knobs */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>
              BPM: {bpm}
              <HelpIcon text="Song tempo in beats per minute" />
            </label>
            <input
              type="range"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              style={{ ...S.input, padding: 0 }}
            />
          </div>
          <div style={S.panel}>
            <label style={S.label}>
              Key
              <HelpIcon text="Musical key; choose Auto for random" />
            </label>
            <div style={S.row}>
              <select value={key} onChange={(e) => setKey(e.target.value)} style={{ ...S.input, padding: "8px 12px" }}>
                {KEYS.map((k) => (
                  <option key={k} value={k}>{displayKey(k)}</option>
                ))}
              </select>
            </div>
            <div style={{ ...S.toggle, marginTop: 8 }}>
              <input type="checkbox" checked={autoKeyPerSong} onChange={(e) => setAutoKeyPerSong(e.target.checked)} disabled={key === "Auto"} />
              <span style={S.small}>Rotate key per song{key === "Auto" ? " (disabled: Auto)" : ""}</span>
            </div>
          </div>
          <div style={S.panel}>
            <label style={S.label}>
              Seed
              <HelpIcon text="Randomness seed for reproducibility" />
            </label>
            <input
              type="number"
              value={seedBase}
              onChange={(e) => setSeedBase(Number(e.target.value || 0))}
              style={S.input}
            />
            <div style={{ ...S.row, marginTop: 8 }}>
              <label style={{ ...S.small, flex: 1 }}>
                <input type="radio" name="seedmode" checked={seedMode === "increment"} onChange={() => setSeedMode("increment")} /> Increment (base + i)
              </label>
              <label style={{ ...S.small, flex: 1 }}>
                <input type="radio" name="seedmode" checked={seedMode === "random"} onChange={() => setSeedMode("random")} /> Deterministic random
              </label>
            </div>
          </div>
        </div>

        {/* structure editor */}
        <div style={{ ...S.panel, marginTop: 12 }}>
          <div style={{ ...S.row, marginBottom: 8 }}>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                const name = e.target.value;
                setSelectedTemplate(name);
                setSectionPreset("");
                setCreatingTemplate(false);
                if (name && templates[name]) {
                  applyTemplate(templates[name]);
                }
              }}
              style={{ ...S.input, padding: "8px 12px" }}
            >
              <option value="">Custom</option>
              {Object.keys(templates).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {selectedTemplate === "" &&
              (creatingTemplate ? (
                <>
                  <input
                    style={S.input}
                    placeholder="Template name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <button
                    style={S.btn}
                    onClick={() => {
                      const nm = newTemplateName.trim();
                      if (!nm) return;
                      const tpl: TemplateSpec = {
                        structure: structure.map(({ name, bars, chords }) => ({ name, bars, chords })),
                        bpm,
                        key,
                        mood,
                        instruments,
                        leadInstrument,
                        ambience,
                        ambienceLevel,
                        drumPattern,
                        variety,
                        chordSpanBeats,
                        hqStereo,
                        hqReverb,
                        hqSidechain,
                        hqChorus,
                        limiterDrive,
                        dither,
                        bpmJitterPct,
                      };
                      setTemplates((prev) => {
                        const next = { ...prev, [nm]: tpl };
                        const custom = Object.fromEntries(
                          Object.entries(next).filter(([k]) => !PRESET_TEMPLATES[k])
                        );
                        localStorage.setItem("songTemplates", JSON.stringify(custom));
                        return next;
                      });
                      setSelectedTemplate(nm);
                      setNewTemplateName("");
                      setCreatingTemplate(false);
                    }}
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  style={S.btn}
                  onClick={() => {
                    setSelectedTemplate("");
                    setCreatingTemplate(true);
                    setNewTemplateName("");
                  }}
                >
                  New Template
                </button>
              ))}
          </div>
          <div style={{ ...S.row, marginBottom: 8 }}>
            <select
              value={sectionPreset}
              onChange={(e) => {
                const name = e.target.value;
                setSectionPreset(name);
                if (name && SECTION_PRESETS[name]) {
                  setStructure(SECTION_PRESETS[name].map((s) => ({ ...s, barsStr: String(s.bars) })));
                  setSelectedTemplate("");
                }
              }}
              style={{ ...S.input, padding: "8px 12px" }}
            >
              <option value="">Preset layout…</option>
              {Object.keys(SECTION_PRESETS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <label style={S.label}>
            Structure (bars)
            <HelpIcon text="Order of song sections with lengths and chords" />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {structure.map((sec, i) => (
              <div key={i} style={{ background: "#17191d", padding: 8, borderRadius: 8, minWidth: 120 }}>
                <div style={S.small}>{sec.name}</div>
                <input
                  type="number"
                  value={sec.barsStr ?? String(sec.bars)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStructure((prev) => {
                      const copy = [...prev];
                      const parsed = parseInt(val, 10);
                      copy[i] = {
                        ...copy[i],
                        bars: !isNaN(parsed) && parsed >= 1 ? parsed : copy[i].bars,
                        barsStr: val,
                      };
                      return copy;
                    });
                    setSelectedTemplate("");
                    setSectionPreset("");
                  }}
                  style={{
                    ...S.input,
                    border:
                      !/^[0-9]+$/.test(sec.barsStr ?? String(sec.bars)) ||
                      parseInt(sec.barsStr ?? String(sec.bars), 10) < 1
                        ? "1px solid #ff7b7b"
                        : undefined,
                  }}
                />
                {!/^[0-9]+$/.test(sec.barsStr ?? String(sec.bars)) ||
                parseInt(sec.barsStr ?? String(sec.bars), 10) < 1 ? (
                  <div style={S.err}>Enter bars ≥1</div>
                ) : null}
                <input
                  type="text"
                  value={sec.chords.join(" ")}
                  placeholder="Chords"
                  onChange={(e) => {
                    const chords = e.target.value
                      .split(/[\s,]+/)
                      .map((c) => c.trim())
                      .filter(Boolean);
                    setStructure((prev) => {
                      const copy = [...prev];
                      copy[i] = { ...copy[i], chords };
                      return copy;
                    });
                    setSelectedTemplate("");
                    setSectionPreset("");
                  }}
                  style={{ ...S.input, marginTop: 4 }}
                />
              </div>
            ))}
          </div>
          <div style={S.small}>
            Total Bars: {totalBars} — Est. Time: {estMinutes}:{estSecs}
          </div>
        </div>

        {/* vibe controls */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>
              Mood
              <HelpIcon text="Tags describing the vibe" />
            </label>
            <div style={S.optionGrid}>
              {MOODS.map((m) => (
                <label key={m} style={S.optionCard}>
                  <span>{m}</span>
                  <input
                    type="checkbox"
                    checked={mood.includes(m)}
                    onChange={() => setMood((prev) => toggle(prev, m))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>
              Instruments
              <HelpIcon text="Select instruments to include" />
            </label>
            <div style={S.optionGrid}>
              {INSTR.map((i) => (
                <label key={i} style={S.optionCard}>
                  <span>{i}</span>
                  <input
                    type="checkbox"
                    checked={instruments.includes(i)}
                    onChange={() => setInstruments((prev) => toggle(prev, i))}
                  />
                </label>
              ))}
            </div>
            <div style={S.small}>Drums are synthesized automatically.</div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>
              Lead Instrument
              <HelpIcon text="Main instrument for the melody" />
            </label>
            <div style={S.optionGrid}>
              {LEAD_INSTR.map((l) => (
                <label key={l.value} style={S.optionCard}>
                  <span>{l.label}</span>
                  <input
                    type="radio"
                    name="leadInstrument"
                    value={l.value}
                    checked={leadInstrument === l.value}
                    onChange={() => setLeadInstrument(l.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={S.panel}>
            <label style={S.label} htmlFor="ambience-select">
              Ambience
              <HelpIcon text="Background ambience sounds" />
            </label>
            <select
              id="ambience-select"
              multiple
              value={ambience}
              onChange={(e) =>
                setAmbience(
                  Array.from(e.target.selectedOptions).map((o) => o.value)
                )
              }
              style={S.input}
            >
              {AMBI.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ambienceLevel}
              onChange={(e) => setAmbienceLevel(Number(e.target.value))}
              style={S.slider}
            />
            <div style={S.small}>{Math.round(ambienceLevel * 100)}% intensity</div>
          </div>
        </div>

        {/* rhythm & feel */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>
              Drum Pattern
              <HelpIcon text="Choose a groove style or no drums" />
            </label>
            <select value={drumPattern} onChange={(e) => setDrumPattern(e.target.value)} style={{ ...S.input, padding: "8px 12px" }}>
              {DRUM_PATS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div style={S.small}>Choose a groove or leave random.</div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>
              Variety
              <HelpIcon text="Amount of fills and swing" />
            </label>
            <input type="range" min={0} max={100} value={variety} onChange={(e) => setVariety(Number(e.target.value))} style={S.slider} />
            <div style={S.small}>{variety}% fills & swing</div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>
              Chord Span
              <HelpIcon text="Number of beats each chord lasts" />
            </label>
            <select
              value={chordSpanBeats}
              onChange={(e) => setChordSpanBeats(Number(e.target.value))}
              style={{ ...S.input, padding: "8px 12px" }}
            >
              <option value={2}>½ bar</option>
              <option value={4}>1 bar</option>
              <option value={8}>2 bars</option>
            </select>
          </div>
        </div>

        {/* polish accordion */}
        <div style={{ ...S.panel, marginTop: 12 }}>
          <details open>
            <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>
              Polish <HelpIcon text="Optional mix polish effects" />
            </summary>
            <div style={{ marginTop: 8 }}>
              <div style={S.optionGrid}>
                <label style={S.optionCard}>
                  <span>Stereo widen</span>
                  <input type="checkbox" checked={hqStereo} onChange={(e) => setHqStereo(e.target.checked)} />
                </label>
                <label style={S.optionCard}>
                  <span>Room reverb</span>
                  <input type="checkbox" checked={hqReverb} onChange={(e) => setHqReverb(e.target.checked)} />
                </label>
                <label style={S.optionCard}>
                  <span>Sidechain (kick)</span>
                  <input type="checkbox" checked={hqSidechain} onChange={(e) => setHqSidechain(e.target.checked)} />
                </label>
                <label style={S.optionCard}>
                  <span>Chorus</span>
                  <input type="checkbox" checked={hqChorus} onChange={(e) => setHqChorus(e.target.checked)} />
                </label>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>Advanced</summary>
                <div style={{ marginTop: 8 }}>
                  <label style={S.label}>
                    Limiter Drive
                    <HelpIcon text="Amount of saturation added by the limiter" />
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={limiterDrive}
                    onChange={(e) => setLimiterDrive(Number(e.target.value))}
                    style={S.slider}
                  />
                  <div style={S.small}>{limiterDrive.toFixed(2)}× saturation</div>
                  <div style={{ ...S.toggle, marginTop: 8 }}>
                    <input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} />
                    <span style={S.small}>Dither</span>
                  </div>
                </div>
              </details>
            </div>
          </details>
        </div>
        {/* album mode toggle */}
        <div style={S.panel}>
          <label style={S.toggle}>
            <input type="checkbox" checked={albumMode} onChange={(e) => setAlbumMode(e.target.checked)} />
            <span style={S.small}>
              Album mode
              <HelpIcon text="Render multiple tracks as an album" />
            </span>
          </label>
          {albumMode && (
            <>
              <label style={S.label}>
                Track Count
                <HelpIcon text="Number of tracks in album mode" />
              </label>
              <input
                type="number"
                min={3}
                max={12}
                value={trackCount}
                onChange={(e) =>
                  setTrackCount(
                    Math.max(3, Math.min(12, Number(e.target.value || 3)))
                  )
                }
                style={S.input}
              />
            </>
          )}
        </div>

        {/* batch + variation */}
        <div style={S.grid2}>
          <div style={S.panel}>
            <label style={S.label}>
              How many songs?
              <HelpIcon text="Number of songs to render in this batch" />
            </label>
            <input type="number" min={1} value={numSongs} onChange={(e) => setNumSongs(Math.max(1, Number(e.target.value || 1)))} style={S.input} />
            <div style={{ ...S.small, marginTop: 8 }}>
              Titles will be suffixed with{" "}
              <select value={titleSuffixMode} onChange={(e) => setTitleSuffixMode(e.target.value as any)} style={{ ...S.input, padding: "4px 8px", display: "inline-block", width: 160, marginLeft: 6 }}>
                <option value="number"># (1, 2, 3…)</option>
                <option value="timestamp">timestamp</option>
              </select>
            </div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>
              BPM Jitter (per song)
              <HelpIcon text="Random tempo variation around base BPM" />
            </label>
            <input type="range" min={0} max={30} value={bpmJitterPct} onChange={(e) => setBpmJitterPct(Number(e.target.value))} style={S.slider} />
            <div style={S.small}>±{bpmJitterPct}% around the base BPM</div>
            <div style={{ ...S.toggle, marginTop: 8 }}>
              <input type="checkbox" checked={playLast} onChange={(e) => setPlayLast(e.target.checked)} />
              <span style={S.small}>Auto‑play last successful render</span>
            </div>
          </div>
        </div>

        {/* actions */}
        <div style={S.actions}>
          <button
            style={S.btn}
            disabled={busy || !outDir || !titleBase || hasInvalidBars}
            onClick={albumMode ? createAlbum : renderBatch}
          >
            {albumMode
              ? busy
                ? "Creating album…"
                : "Create Album"
              : busy
                ? "Rendering batch…"
                : "Render Songs"}
          </button>

          <button
            style={S.playBtn}
            onClick={async () => {
              if (previewPlaying) {
                previewStop();
              } else {
                setPreviewBpm(bpm);
                setPreviewKey(key === "Auto" ? "C" : key);
                setPreviewSeed(seedBase);
                await previewPlay();
              }
            }}
          >
            {previewPlaying ? "Stop preview" : "Preview in browser"}
          </button>

          <button
            style={S.playBtn}
            onClick={async () => {
              const a = audioRef.current;
              if (!a?.src) return setErr("No track loaded.");
              if (isPlaying) {
                a.pause();
                setIsPlaying(false);
              } else {
                await a.play();
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? "Pause" : "Play last track"}
          </button>
        </div>

        {globalStatus && <div style={S.status}>Status: {globalStatus}</div>}
        {busy && (
          <div style={S.progressOuter}>
            <div style={{ ...S.progressInner, width: `${progress}%` }} />
          </div>
        )}
        {err && <div style={S.err}>Error: {err}</div>}

        {jobs.length > 0 && (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Title</th>
                <th style={S.th}>Key</th>
                <th style={S.th}>BPM</th>
                <th style={S.th}>Seed</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Output</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td style={S.td}>{j.title}</td>
                  <td style={S.td}>{showKey(j.spec.key)}</td>
                  <td style={S.td}>{j.spec.bpm}</td>
                  <td style={S.td}>{j.spec.seed}</td>
                  <td style={S.td}>
                    {j.error ? <span style={{ color: "#ff7b7b" }}>error</span> : j.status || "—"}
                    {j.error && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ opacity: 0.8, cursor: "pointer" }}>details</summary>
                        <pre style={{ whiteSpace: "pre-wrap" }}>{j.error}</pre>
                      </details>
                    )}
                  </td>
                  <td style={S.td}>
                    {j.outPath ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Waveform src={convertFileSrc(j.outPath!.replace(/\\/g, "/"))} />
                        <button
                          style={S.playBtn}
                          onClick={async () => {
                            const url = convertFileSrc(j.outPath!.replace(/\\/g, "/"));
                            const a = audioRef.current!;
                            a.pause();
                            a.src = url;
                            a.load();
                            await a.play();
                            setIsPlaying(true);
                          }}
                        >
                          Play
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ========= tiny deterministic PRNG for variation (seedMode=random) ========= */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

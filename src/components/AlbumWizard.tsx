import { useEffect, useState } from "react";
import { Button, Step, StepLabel, Stepper } from "@mui/material";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import VibeControls from "./VibeControls";
import RhythmControls from "./RhythmControls";
import PolishControls from "./PolishControls";
import { PRESET_TEMPLATES } from "./songTemplates";
import styles from "./SongForm.module.css";
import { MOODS, INSTR } from "../utils/musicData";
import { useTasks } from "../store/tasks";

export type Section = { name: string; bars: number; chords: string[] };

type SongSpec = {
  title: string;
  outDir: string;
  album?: string;
  bpm: number;
  key: string;
  structure: Section[];
  mood: string[];
  instruments: string[];
  lead_instrument?: string;
  ambience: string[];
  ambience_level: number;
  seed: number;
  variety: number;
  chord_span_beats?: number;
  drum_pattern?: string;
  hq_stereo?: boolean;
  hq_reverb?: boolean;
  hq_sidechain?: boolean;
  hq_chorus?: boolean;
  limiter_drive?: number;
  dither_amount?: number;
  sfzInstrument?: string;
};

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
  { value: "french horn", label: "french horn" },
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
  if (instrs.includes("french horn")) return "french horn";
  if (instrs.includes("glockenspiel")) return "glockenspiel";
  if (instrs.includes("synth lead")) return "synth lead";
  return "synth lead";
}

export default function AlbumWizard() {
  const defaultTpl = PRESET_TEMPLATES["Classic Lofi"];
  const [activeStep, setActiveStep] = useState(0);

  const [titleBase, setTitleBase] = useState("");
  const [outDir, setOutDir] = useState("");
  const [bpm, setBpm] = useState(defaultTpl.bpm);
  const [key, setKey] = useState<string>(defaultTpl.key);
  const [mood, setMood] = useState<string[]>(defaultTpl.mood);
  const [instruments, setInstruments] = useState<string[]>(defaultTpl.instruments);
  const [leadInstrument, setLeadInstrument] = useState(
    defaultTpl.leadInstrument ?? inferLeadInstrument(defaultTpl.instruments)
  );
  const [ambience, setAmbience] = useState<string[]>(defaultTpl.ambience);
  const [ambienceLevel, setAmbienceLevel] = useState(defaultTpl.ambienceLevel ?? 0.5);
  const [drumPattern, setDrumPattern] = useState<string>(defaultTpl.drumPattern);
  const [variety, setVariety] = useState(defaultTpl.variety);
  const [chordSpanBeats, setChordSpanBeats] = useState(
    defaultTpl.chordSpanBeats ?? 4
  );
  const [hqStereo, setHqStereo] = useState(defaultTpl.hqStereo);
  const [hqReverb, setHqReverb] = useState(defaultTpl.hqReverb);
  const [hqSidechain, setHqSidechain] = useState(defaultTpl.hqSidechain);
  const [hqChorus, setHqChorus] = useState(defaultTpl.hqChorus);
  const [limiterDrive, setLimiterDrive] = useState(defaultTpl.limiterDrive);
  const [dither, setDither] = useState(defaultTpl.dither);
  const [seed, setSeed] = useState(0);

  const enqueueTask = useTasks((s) => s.enqueueTask);
  const tasks = useTasks((s) => s.tasks);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const steps = ["Song Info", "Instruments", "Render Options"];

  useEffect(() => {
    if (!taskId) return;
    const t = tasks[taskId];
    if (!t) return;
    if (t.status === "failed") {
      setErr(t.error ?? "Task failed");
      setTaskId(null);
    } else if (t.status === "completed") {
      setTaskId(null);
    }
  }, [taskId, tasks]);

  async function pickFolder() {
    try {
      const dir = await openDialog({ directory: true, multiple: false });
      if (dir) setOutDir(dir as string);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  function makeSpec(): SongSpec {
    return {
      title: titleBase,
      outDir,
      album: undefined,
      bpm,
      key,
      structure: defaultTpl.structure,
      mood,
      instruments,
      lead_instrument: leadInstrument,
      ambience,
      ambience_level: ambienceLevel,
      seed,
      variety,
      chord_span_beats: chordSpanBeats,
      drum_pattern: drumPattern === "random" ? undefined : drumPattern,
      hq_stereo: hqStereo,
      hq_reverb: hqReverb,
      hq_sidechain: hqSidechain,
      hq_chorus: hqChorus,
      limiter_drive: limiterDrive,
      dither_amount: dither ? 1 : 0,
      sfzInstrument: undefined,
    };
  }

  async function handleSubmit() {
    setErr(null);
    if (!titleBase || !outDir) {
      setErr("Please provide a title and output folder.");
      return;
    }
    try {
      const id = await enqueueTask("Music Generation", {
        id: "GenerateAlbum",
        meta: {
          track_count: 1,
          title_base: titleBase,
          track_names: [titleBase],
          out_dir: outDir,
          specs: [makeSpec()],
        },
      });
      setTaskId(id);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  const canNext =
    activeStep === 0
      ? titleBase.trim() !== "" && outDir.trim() !== ""
      : activeStep === 1
      ? instruments.length > 0
      : true;

  return (
    <div className={styles.form}>
      <Stepper activeStep={activeStep} className="mb-4">
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {activeStep === 0 && (
        <div className={styles.panel}>
          <label className={styles.label}>Song Title Base</label>
          <input
            className={styles.input}
            placeholder="Song Title Base"
            value={titleBase}
            onChange={(e) => setTitleBase(e.target.value)}
          />
          <label className={styles.label}>Output Folder</label>
          <div className="flex gap-2 items-center">
            <button className={styles.btn} onClick={pickFolder}>
              Choose Folder
            </button>
            {outDir && <span className={styles.small}>{outDir}</span>}
          </div>
          <label className={styles.label}>BPM</label>
          <input
            type="number"
            className={styles.input}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <label className={styles.label}>Key</label>
          <input
            className={styles.input}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
      )}
      {activeStep === 1 && (
        <VibeControls
          MOODS={MOODS}
          INSTR={INSTR}
          LEAD_INSTR={LEAD_INSTR}
          AMBI={AMBI}
          mood={mood}
          setMood={(fn) => setMood(fn)}
          instruments={instruments}
          setInstruments={(fn) => setInstruments(fn)}
          leadInstrument={leadInstrument}
          setLeadInstrument={setLeadInstrument}
          ambience={ambience}
          setAmbience={(fn) => setAmbience(fn)}
          ambienceLevel={ambienceLevel}
          setAmbienceLevel={setAmbienceLevel}
        />
      )}
      {activeStep === 2 && (
        <div>
          <RhythmControls
            DRUM_PATS={DRUM_PATS}
            drumPattern={drumPattern}
            setDrumPattern={setDrumPattern}
            variety={variety}
            setVariety={setVariety}
            chordSpanBeats={chordSpanBeats}
            setChordSpanBeats={setChordSpanBeats}
          />
          <PolishControls
            hqStereo={hqStereo}
            setHqStereo={setHqStereo}
            hqReverb={hqReverb}
            setHqReverb={setHqReverb}
            hqSidechain={hqSidechain}
            setHqSidechain={setHqSidechain}
            hqChorus={hqChorus}
            setHqChorus={setHqChorus}
            limiterDrive={limiterDrive}
            setLimiterDrive={setLimiterDrive}
            dither={dither}
            setDither={setDither}
          />
          <div className="mt-4">
            <label className={styles.label}>Seed</label>
            <input
              type="number"
              className={styles.input}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
            <Button
              variant="contained"
              onClick={handleSubmit}
              className="mt-4"
            >
              Render Song
            </Button>
            {err && <div className={styles.err}>{err}</div>}
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
        )}
        {activeStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={() => setActiveStep((s) => s + 1)}
            disabled={!canNext}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

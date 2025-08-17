// src/components/SongForm.tsx — HQ wiring for lofi_gpu_hq
import { useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLofi } from "../features/lofi/SongForm";

type Section = { name: string; bars: number; chords: string[] };

type SongSpec = {
  title: string;
  outDir: string;
  bpm: number;
  key: string; // "C".."B" or "Auto"
  structure: Section[];
  mood: string[];
  instruments: string[];
  ambience: string[];
  ambienceLevel: number; // 0..1
  seed: number;
  variety: number; // 0..100
  drum_pattern?: string;
  // NEW HQ feature flags (read by lofi_gpu_hq.py)
  hq_stereo?: boolean;
  hq_reverb?: boolean;
  hq_sidechain?: boolean;
  hq_chorus?: boolean;
  limiter_drive?: number;
};

type TemplateSpec = {
  structure: Section[];
  bpm: number;
  key: string;
  mood: string[];
  instruments: string[];
  ambience: string[];
  drumPattern: string;
  variety: number;
  hqStereo: boolean;
  hqReverb: boolean;
  hqSidechain: boolean;
  hqChorus: boolean;
  limiterDrive: number;
  bpmJitterPct: number;
};

type Job = {
  id: string;
  title: string;
  spec: SongSpec;
  status: string;
  outPath?: string;
  error?: string;
};

const KEYS_BASE = ["C", "D", "E", "F", "G", "A", "B"];
const KEYS = ["Auto", ...KEYS_BASE];
const MOODS = ["calm", "melancholy", "cozy", "nostalgic"];
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
];
const AMBI = ["rain", "cafe"];
const DRUM_PATS = [
  "random",
  "no_drums",
  "boom_bap_A",
  "boom_bap_B",
  "laidback",
  "half_time",
  "swing",
  "half_time_shuffle",
];
const PRESET_TEMPLATES: Record<string, TemplateSpec> = {
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
    bpmJitterPct: 6,
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
    mood: ["nostalgic", "melancholy"],
    instruments: ["flute", "piano", "upright bass"],
    ambience: ["rain"],
    drumPattern: "swing",
    variety: 35,
    hqStereo: true,
    hqReverb: true,
    hqSidechain: true,
    hqChorus: true,
    limiterDrive: 1.05,
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
    bpmJitterPct: 2,
  },
};

const SONG_TEMPLATES = PRESET_TEMPLATES;

export default function SongForm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // THEME (applies to all songs)
  const [titleBase, setTitleBase] = useState("Midnight Coffee");
  const [outDir, setOutDir] = useState(localStorage.getItem("outDir") ?? "");
  const [bpm, setBpm] = useState(80);
  const [key, setKey] = useState<string>("Auto");
  const [mood, setMood] = useState<string[]>(["calm", "cozy", "nostalgic"]);
  const [instruments, setInstruments] = useState<string[]>([
    "rhodes",
    "nylon guitar",
    "upright bass",
  ]);
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
  const [structure, setStructure] = useState<Section[]>(() =>
    PRESET_TEMPLATES["Classic Lofi"].structure.map((s) => ({ ...s }))
  );
  const [newTemplateName, setNewTemplateName] = useState("");
  const [genTitleLoading, setGenTitleLoading] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  function applyTemplate(tpl: TemplateSpec) {
    setStructure(tpl.structure.map((s) => ({ ...s })));
    setBpm(tpl.bpm);
    setKey(tpl.key);
    setMood(tpl.mood);
    setInstruments(tpl.instruments);
    setAmbience(tpl.ambience);
    setDrumPattern(tpl.drumPattern);
    setVariety(tpl.variety);
    setHqStereo(tpl.hqStereo);
    setHqReverb(tpl.hqReverb);
    setHqSidechain(tpl.hqSidechain);
    setHqChorus(tpl.hqChorus);
    setLimiterDrive(tpl.limiterDrive);
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

  // NEW: Mix polish toggles mapping to engine flags
  const [hqStereo, setHqStereo] = useState(true);
  const [hqReverb, setHqReverb] = useState(true);
  const [hqSidechain, setHqSidechain] = useState(true);
  const [hqChorus, setHqChorus] = useState(true);
  const [limiterDrive, setLimiterDrive] = useState(1.02);

  // UI state
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [globalStatus, setGlobalStatus] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
          try {
            const obj = JSON.parse(raw);
            if (obj && obj.stage && obj.message) pretty = `${obj.stage}: ${obj.message}`;
          } catch {}
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

  function makeSpecForIndex(i: number): SongSpec {
    const amb = Math.max(0, Math.min(1, ambienceLevel));
    const varPct = Math.max(0, Math.min(100, variety));

    return {
      title: buildTitle(i),
      outDir,
      bpm: jitterBpm(i),
      key: pickKey(i),
      structure,
      mood,
      instruments,
      ambience,
      ambienceLevel: amb,
      seed: pickSeed(i),
      variety: varPct,
      drum_pattern: drumPattern === "random" ? undefined : drumPattern,
      // pass-through HQ flags
      hq_stereo: hqStereo,
      hq_reverb: hqReverb,
      hq_sidechain: hqSidechain,
      hq_chorus: hqChorus,
      limiter_drive: Math.max(0.5, Math.min(2, limiterDrive)),
    };
  }

  async function renderBatch() {
    setErr(null);
    setGlobalStatus("");
    setIsPlaying(false);

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
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "starting…" } : j)));
        try {
          const outPath = await invoke<string>("run_lofi_song", { spec: job.spec });
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, outPath, status: "done" } : j)));
        } catch (e: any) {
          const message = e?.message || String(e);
          console.error("run_lofi_song failed:", e);
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: message } : j)));
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
    chips: { display: "flex", gap: 12, flexWrap: "wrap" },
    actions: { marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    status: { marginTop: 10, fontSize: 12, opacity: 0.8 },
    err: { marginTop: 8, color: "#ff7b7b", fontSize: 12 },
    table: { width: "100%", marginTop: 12, borderCollapse: "collapse", fontSize: 13 },
    th: { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #2b2e33", opacity: 0.8 },
    td: { padding: "8px 6px", borderBottom: "1px solid #1e2025" },
    chipBtn: { border: "1px solid #2b2e33", padding: "6px 10px", borderRadius: 999, cursor: "pointer", background: "transparent", color: "#e7e7ea" },
    chipOn: { border: "1px solid #3a82f6", background: "#3a82f6", color: "#fff" },
    toggle: { display: "flex", gap: 8, alignItems: "center" },
    slider: { width: "100%" },
    playBtn: { padding: "10px 14px", borderRadius: 10, border: "1px solid #2b2e33", background: "transparent", color: "#e7e7ea", cursor: "pointer", minWidth: 120 },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.h1}>Blossom — Song Builder (Batch + Vibes)</div>

        {/* template selector */}
        <div style={S.panel}>
          <label style={S.label}>Song Templates</label>
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
            <option value="Quick Beat">Quick Beat</option>
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
            <label style={S.label}>BPM: {bpm}</label>
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
            <label style={S.label}>Key</label>
            <div style={S.row}>
              <select value={key} onChange={(e) => setKey(e.target.value)} style={{ ...S.input, padding: "8px 12px" }}>
                {KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div style={{ ...S.toggle, marginTop: 8 }}>
              <input type="checkbox" checked={autoKeyPerSong} onChange={(e) => setAutoKeyPerSong(e.target.checked)} disabled={key === "Auto"} />
              <span style={S.small}>Rotate key per song{key === "Auto" ? " (disabled: Auto)" : ""}</span>
            </div>
          </div>
          <div style={S.panel}>
            <label style={S.label}>Seed</label>
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
                        structure: structure.map((s) => ({ ...s })),
                        bpm,
                        key,
                        mood,
                        instruments,
                        ambience,
                        drumPattern,
                        variety,
                        hqStereo,
                        hqReverb,
                        hqSidechain,
                        hqChorus,
                        limiterDrive,
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
          <label style={S.label}>Structure (bars)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {structure.map((sec, i) => (
              <div key={i} style={{ background: "#17191d", padding: 8, borderRadius: 8, minWidth: 120 }}>
                <div style={S.small}>{sec.name}</div>
                <input
                  type="number"
                  value={sec.bars}
                  min={1}
                  onChange={(e) => {
                    const bars = Math.max(1, Number(e.target.value || 1));
                    setStructure((prev) => {
                      const copy = [...prev];
                      copy[i] = { ...copy[i], bars };
                      return copy;
                    });
                    setSelectedTemplate("");
                  }}
                  style={S.input}
                />
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
                  }}
                  style={{ ...S.input, marginTop: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* vibe controls */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>Mood</label>
            <div style={S.chips}>
              {MOODS.map((m) => {
                const on = mood.includes(m);
                return (
                  <button key={m} onClick={() => setMood((prev) => toggle(prev, m))} style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>Instruments</label>
            <div style={S.chips}>
              {INSTR.map((i) => {
                const on = instruments.includes(i);
                return (
                  <button key={i} onClick={() => setInstruments((prev) => toggle(prev, i))} style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}>
                    {i}
                  </button>
                );
              })}
            </div>
            <div style={S.small}>Drums are synthesized automatically.</div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>Ambience</label>
            <div style={S.chips}>
              {AMBI.map((a) => {
                const on = ambience.includes(a);
                return (
                  <button key={a} onClick={() => setAmbience((prev) => toggle(prev, a))} style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}>
                    {a}
                  </button>
                );
              })}
            </div>
            <input type="range" min={0} max={1} step={0.01} value={ambienceLevel} onChange={(e) => setAmbienceLevel(Number(e.target.value))} style={S.slider} />
            <div style={S.small}>{Math.round(ambienceLevel * 100)}% intensity</div>
          </div>
        </div>

        {/* rhythm & feel */}
        <div style={S.grid2}>
          <div style={S.panel}>
            <label style={S.label}>Drum Pattern</label>
            <select value={drumPattern} onChange={(e) => setDrumPattern(e.target.value)} style={{ ...S.input, padding: "8px 12px" }}>
              {DRUM_PATS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div style={S.small}>Choose a groove or leave random.</div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>Variety</label>
            <input type="range" min={0} max={100} value={variety} onChange={(e) => setVariety(Number(e.target.value))} style={S.slider} />
            <div style={S.small}>{variety}% fills & swing</div>
          </div>
        </div>

        {/* mix polish (HQ flags) */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>Mix Polish</label>
            <div style={S.toggle}>
              <input type="checkbox" checked={hqStereo} onChange={(e) => setHqStereo(e.target.checked)} />
              <span style={S.small}>Stereo widen</span>
            </div>
            <div style={S.toggle}>
              <input type="checkbox" checked={hqReverb} onChange={(e) => setHqReverb(e.target.checked)} />
              <span style={S.small}>Room reverb</span>
            </div>
            <div style={S.toggle}>
              <input type="checkbox" checked={hqSidechain} onChange={(e) => setHqSidechain(e.target.checked)} />
              <span style={S.small}>Sidechain (kick)</span>
            </div>
            <div style={S.toggle}>
              <input type="checkbox" checked={hqChorus} onChange={(e) => setHqChorus(e.target.checked)} />
              <span style={S.small}>Chorus</span>
            </div>
            <div style={{ ...S.small, marginTop: 6 }}>These map to engine flags in <code>lofi_gpu_hq.py</code>.</div>
          </div>
          <div style={S.panel}>
            <label style={S.label}>Limiter Drive</label>
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
          </div>
        </div>

        {/* batch + variation */}
        <div style={S.grid2}>
          <div style={S.panel}>
            <label style={S.label}>How many songs?</label>
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
            <label style={S.label}>BPM Jitter (per song)</label>
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
          <button style={S.btn} disabled={busy || !outDir || !titleBase} onClick={renderBatch}>
            {busy ? "Rendering batch…" : "Render Songs"}
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
                  <td style={S.td}>{j.spec.key}</td>
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

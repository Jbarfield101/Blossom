// src/components/SongForm.tsx — HQ wiring for lofi renderer
import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLofi } from "../features/lofi/SongForm";
import { WEATHER_PRESETS } from "../features/lofi/weather";
import Waveform from "./Waveform";
import TemplateSelector from "./TemplateSelector";
import VibeControls from "./VibeControls";
import RhythmControls from "./RhythmControls";
import PolishControls from "./PolishControls";
import BatchActions from "./BatchActions";
import HelpIcon from "./HelpIcon";
import { PRESET_TEMPLATES, SECTION_PRESETS } from "./songTemplates";
import styles from "./SongForm.module.css";
import clsx from "clsx";
import { useTheme } from "@mui/material/styles";
import { MOODS, INSTR } from "../utils/musicData";
import { useTasks } from "../store/tasks";

export type Section = { name: string; bars: number; chords: string[]; barsStr?: string };

type SongSpec = {
  title: string;
  outDir: string;
  album?: string;
  bpm: number;
  key: string;
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

export type TemplateSpec = {
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

function friendlyError(msg: string): string {
  if (/ffmpeg/i.test(msg)) {
    return "FFmpeg is missing; install it or update PATH.";
  }
  return msg;
}

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
const showKey = (k: SongSpec["key"]) => displayKey(k);
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


const SONG_TEMPLATES = PRESET_TEMPLATES;

export default function SongForm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimer = useRef<number | null>(null);
  const theme = useTheme();
  const {
    bpm: defaultBpm,
    key: defaultKey,
    hqStereo: defaultHqStereo,
    hqReverb: defaultHqReverb,
    hqSidechain: defaultHqSidechain,
    hqChorus: defaultHqChorus,
  } = useAudioDefaults();

  // THEME (applies to all songs)
  const [titleBase, setTitleBase] = useState("");
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

  useEffect(() => {
    const stored = localStorage.getItem("lastInstruments");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setInstruments(parsed);
        setLeadInstrument(inferLeadInstrument(parsed));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lastInstruments", JSON.stringify(instruments));
  }, [instruments]);

  // Album mode
  const storedAlbumMeta = useMemo(() => {
    try {
      const raw = localStorage.getItem("albumMeta");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);
  const [albumMode, setAlbumMode] = useState(false);
  const [trackCount, setTrackCount] = useState(6);
  const [albumName, setAlbumName] = useState<string>(
    storedAlbumMeta.albumName ?? ""
  );
  const [trackNames, setTrackNames] = useState<string[]>(
    storedAlbumMeta.trackNames ?? []
  );
  const [albumImagePrompt, setAlbumImagePrompt] = useState<string>(
    storedAlbumMeta.imagePrompt ?? ""
  );
  const [albumImageUrl, setAlbumImageUrl] = useState<string>(
    storedAlbumMeta.imagePrompt
      ? `https://image.pollinations.ai/prompt/${encodeURIComponent(
          storedAlbumMeta.imagePrompt
        )}`
      : ""
  );

  useEffect(() => {
    setTrackNames((prev) => {
      const arr = [...prev];
      if (arr.length < trackCount) {
        return [...arr, ...Array(trackCount - arr.length).fill("")];
      }
      return arr.slice(0, trackCount);
    });
  }, [trackCount]);

  useEffect(() => {
    localStorage.setItem(
      "albumMeta",
      JSON.stringify({
        albumName,
        trackNames,
        imagePrompt: albumImagePrompt,
      })
    );
  }, [albumName, trackNames, albumImagePrompt]);

  const albumReady =
    albumName.trim() !== "" &&
    trackNames.length === trackCount &&
    trackNames.every((t) => t.trim() !== "");

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
    weatherPreset,
    weatherEnabled,
    setWeatherEnabled,
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
    return () => {
      if (previewTimer.current) {
        clearTimeout(previewTimer.current);
      }
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

  const tasks = useTasks((s) => s.tasks);
  const tasksSubscribe = useTasks((s) => s.subscribe);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    tasksSubscribe().then((u) => {
      unlisten = u;
    });
    return () => {
      unlisten?.();
    };
  }, [tasksSubscribe]);

  const activeTask = useMemo(
    () =>
      Object.values(tasks).find(
        (t) =>
          ["queued", "running"].includes(t.status) &&
          /song|album/i.test(t.label)
      ),
    [tasks]
  );

  useEffect(() => {
    if (activeTask) {
      setProgress(activeTask.progress);
      setGlobalStatus(activeTask.status);
      setBusy(true);
    } else if (!runningJobId) {
      setBusy(false);
      setGlobalStatus("");
      setProgress(0);
    }
  }, [activeTask, runningJobId]);

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
      const dir = await openDialog({ directory: true, multiple: false });
      if (dir) {
        setOutDir(dir as string);
        localStorage.setItem("outDir", dir as string);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function generateAlbumArtPrompt(name: string) {
    try {
      const reply: string = await invoke("general_chat", {
        messages: [
          {
            role: "system",
            content:
              "You craft vivid, concise prompts for album cover images. Respond with only the prompt.",
          },
          { role: "user", content: `Album theme: ${name}` },
        ],
      });
      const line = reply.split("\n")[0].trim();
      if (line) {
        setAlbumImagePrompt(line);
        setAlbumImageUrl(
          `https://image.pollinations.ai/prompt/${encodeURIComponent(line)}`
        );
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function generateTitle() {
    try {
      setGenTitleLoading(true);
      await invoke("start_ollama");
      if (albumMode) {
        const reply: string = await invoke("general_chat", {
          messages: [
            {
              role: "system",
              content:
                "You are a creative assistant that suggests lofi album names and track titles. Respond with JSON {\"album\":\"Album Name\",\"tracks\":[\"Track 1\",...]}.",
            },
            {
              role: "user",
              content: `Theme: ${titleBase}. Number of tracks: ${trackCount}`,
            },
          ],
        });
        let artName = albumName;
        try {
          const parsed = JSON.parse(reply);
          if (parsed.album) {
            setAlbumName(parsed.album);
            artName = parsed.album;
          }
          if (Array.isArray(parsed.tracks)) {
            setTrackNames((prev) => {
              const updated = [...parsed.tracks.slice(0, trackCount)];
              return updated.length < trackCount
                ? [...updated, ...Array(trackCount - updated.length).fill("")]
                : updated;
            });
          }
        } catch {
          const lines = reply.split("\n").filter(Boolean);
          if (lines.length > 0) {
            setAlbumName(lines[0]);
            artName = lines[0];
            setTrackNames((prev) => {
              const updated = lines.slice(1, trackCount + 1);
              return updated.length < trackCount
                ? [...updated, ...Array(trackCount - updated.length).fill("")]
                : updated;
            });
          }
        }
        await generateAlbumArtPrompt(artName);
      } else {
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
        const line = reply
          .split("\n")[0]
          .replace(/^['\"]|['\"]$/g, "")
          .trim();
        if (line) setTitleBase(line);
      }
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

  function formatSpecKey(k: string): string {
    return k.replace("♭", "b").replace("♯", "#");
  }

  function makeSpecForIndex(i: number): SongSpec {
    const amb = Math.max(0, Math.min(1, ambienceLevel));
    const varPct = Math.max(0, Math.min(100, variety));

    return {
      title: buildTitle(i),
      outDir,
      album: albumMode ? albumName : undefined,
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

    if (!titleBase || !outDir || (albumMode && !albumReady)) {
      setErr("Please set required titles and choose an output folder.");
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
      const res: { album_dir: string } = await invoke("generate_album", {
        meta: {
          track_count: trackCount,
          title_base: titleBase,
          album_name: albumName,
          track_names: trackNames,
          out_dir: outDir,
        },
      });
      setOutDir(res.album_dir);
    } catch (e: any) {
      const message = e?.message || String(e);
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  const handleRender = () => {
    albumMode ? createAlbum() : renderBatch();
  };

  async function handlePreview() {
    if (previewPlaying) {
      previewStop();
      if (previewTimer.current) {
        clearTimeout(previewTimer.current);
        previewTimer.current = null;
      }
    } else {
      setPreviewBpm(bpm);
      setPreviewKey(key === "Auto" ? "C" : key);
      setPreviewSeed(seedBase);
      await previewPlay();
      previewTimer.current = window.setTimeout(() => {
        previewStop();
        previewTimer.current = null;
      }, 5000);
    }
  }

  async function openOutputFolder() {
    if (!outDir) return;
    try {
      await openPath(outDir);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function handleCopyLast() {
    const last = [...jobs].reverse().find((j) => j.outPath);
    if (last?.outPath) {
      try {
        await navigator.clipboard.writeText(last.outPath);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    }
  }

  async function handlePlayLastTrack() {
    const a = audioRef.current;
    if (!a?.src) return setErr("No track loaded.");
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      await a.play();
      setIsPlaying(true);
    }
  }

  async function getFreshJobs(): Promise<Job[]> {
    return new Promise((r) => setJobs((prev) => (r(prev), prev)));
  }

  function restoreLastSettings() {
    const lastTpl = localStorage.getItem("lastSongTemplate");
    if (lastTpl && templates[lastTpl]) {
      setSelectedTemplate(lastTpl);
      applyTemplate(templates[lastTpl]);
    }
    const lastInstr = localStorage.getItem("lastInstruments");
    if (lastInstr) {
      try {
        const parsed = JSON.parse(lastInstr) as string[];
        setInstruments(parsed);
        setLeadInstrument(inferLeadInstrument(parsed));
      } catch {}
    }
    const lastDir = localStorage.getItem("outDir");
    if (lastDir) {
      setOutDir(lastDir);
    }
  }

  function restoreDefaults() {
    setSelectedTemplate("");
    applyTemplate(PRESET_TEMPLATES["Classic Lofi"]);
    setTitleBase("");
    setOutDir("");
    setAutoKeyPerSong(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.h1}>Blossom — Song Builder (Batch + Vibes)</div>

        {weatherPreset && (
          <div className={styles.row}>
            <div className={styles.small}>
              Weather preset: {weatherPreset} (BPM {WEATHER_PRESETS[weatherPreset].bpm}, Key {displayKey(WEATHER_PRESETS[weatherPreset].key)})
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={weatherEnabled}
                onChange={(e) => setWeatherEnabled(e.target.checked)}
              />
              Use weather
            </label>
          </div>
        )}

        {/* template selector */}
        <TemplateSelector
          templates={SONG_TEMPLATES}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          applyTemplate={applyTemplate}
        />

        <div className={styles.row}>
          <button className={styles.btn} onClick={restoreLastSettings}>
            Use last settings
          </button>
          <button className={styles.btn} onClick={restoreDefaults}>
            Restore defaults
          </button>
        </div>

        {/* title + output folder */}
        <label htmlFor="titleBase" className={styles.label}>
          Song Title Base
          <HelpIcon text="Base title for songs, e.g., 'Morning Chill'" />
        </label>
        <div className={styles.row}>
          <input
            id="titleBase"
            className={styles.input}
            placeholder="Song title base"
            value={titleBase}
            onChange={(e) => setTitleBase(e.target.value)}
          />
          <button className={styles.btn} onClick={generateTitle} disabled={genTitleLoading}>
            {genTitleLoading
              ? "Generating..."
              : albumMode
              ? "Generate Album Titles"
              : "Generate Title"}
          </button>
          <button className={styles.btn} onClick={pickFolder}>
            {outDir ? "Change folder" : "Choose folder"}
          </button>
        </div>
        <div className={styles.small}>{outDir || "No output folder selected"}</div>

        {/* core knobs */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs opacity-80">Core</summary>
          <div className={styles.grid3}>
            <div className={styles.panel}>
              <label htmlFor="bpm" className={styles.label}>
                BPM: {bpm}
                <HelpIcon text="Song tempo in beats per minute (e.g., 90)" />
              </label>
              <input
                id="bpm"
                type="range"
                min={60}
                max={200}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className={clsx(styles.input, "p-0")}
              />
            </div>
            <div className={styles.panel}>
              <label htmlFor="key" className={styles.label}>
                Key
                <HelpIcon text="Musical key (e.g., C minor). Choose Auto for random." />
              </label>
              <div className={styles.row}>
                <select
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className={clsx(styles.input, "py-2 px-3")}
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k}>{displayKey(k)}</option>
                  ))}
                </select>
              </div>
              <label className={clsx(styles.toggle, "mt-2") } htmlFor="autoKeyPerSong">
                <input
                  id="autoKeyPerSong"
                  type="checkbox"
                  checked={autoKeyPerSong}
                  onChange={(e) => setAutoKeyPerSong(e.target.checked)}
                  disabled={key === "Auto"}
                />
                <span className={styles.small}>
                  Rotate key per song
                  <HelpIcon text="Cycle through different keys for each song" />
                </span>
              </label>
              {key === "Auto" && (
                <div className={styles.small}>Disabled when key is set to Auto</div>
              )}
            </div>
            <div className={styles.panel}>
              <label htmlFor="seed" className={styles.label}>
                Seed
                <HelpIcon text="Randomness seed for reproducibility (default 12345)" />
              </label>
              <input
                id="seed"
                type="number"
                value={seedBase}
                onChange={(e) => setSeedBase(Number(e.target.value || 0))}
                className={styles.input}
              />
              <fieldset className={clsx(styles.row, "mt-2")}>
                <legend className={styles.small}>
                  Seed Mode
                  <HelpIcon text="How to vary the seed between songs" />
                </legend>
                <label className={clsx(styles.small, "flex-1") } htmlFor="seedmode-increment">
                  <input
                    id="seedmode-increment"
                    type="radio"
                    name="seedmode"
                    checked={seedMode === "increment"}
                    onChange={() => setSeedMode("increment")}
                  /> Increment (base + i)
                </label>
                <label className={clsx(styles.small, "flex-1") } htmlFor="seedmode-random">
                  <input
                    id="seedmode-random"
                    type="radio"
                    name="seedmode"
                    checked={seedMode === "random"}
                    onChange={() => setSeedMode("random")}
                  /> Deterministic random
                </label>
              </fieldset>
            </div>
          </div>
        </details>

        {/* structure editor */}
        <details className={clsx(styles.panel, "mt-3")}>
          <summary className="cursor-pointer text-xs opacity-80">Structure</summary>
          <div className="mt-2">
          <label htmlFor="templateSelect" className={styles.label}>
            Structure Template
            <HelpIcon text="Choose a structure template" />
          </label>
          <div className={clsx(styles.row, "mb-2")}> 
            <select
              id="templateSelect"
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
              className={clsx(styles.input, "py-2 px-3")}
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
                  <label htmlFor="newTemplateName" className="sr-only">
                    Template name
                  </label>
                  <input
                    id="newTemplateName"
                    className={styles.input}
                    placeholder="Template name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <button
                    className={styles.btn}
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
                  className={styles.btn}
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
          <label htmlFor="sectionPreset" className={styles.label}>
            Preset Layout
            <HelpIcon text="Quickly apply a predefined arrangement" />
          </label>
          <div className={clsx(styles.row, "mb-2")}> 
            <select
              id="sectionPreset"
              value={sectionPreset}
              onChange={(e) => {
                const name = e.target.value;
                setSectionPreset(name);
                if (name && SECTION_PRESETS[name]) {
                  setStructure(SECTION_PRESETS[name].map((s) => ({ ...s, barsStr: String(s.bars) })));
                  setSelectedTemplate("");
                }
              }}
              className={clsx(styles.input, "py-2 px-3")}
            >
              <option value="">Preset layout…</option>
              {Object.keys(SECTION_PRESETS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <label className={styles.label}>
            Structure (bars)
            <HelpIcon text="Order of song sections with lengths and chords" />
          </label>
          <div className="flex gap-2 flex-wrap">
            {structure.map((sec, i) => (
              <div
                key={i}
                className="p-2 rounded-lg min-w-[120px]"
                style={{ backgroundColor: theme.palette.action.hover }}
              >
                <label htmlFor={`bars-${i}`} className={styles.small}>
                  {sec.name} Bars
                  <HelpIcon text="Number of bars in this section" />
                </label>
                <input
                  id={`bars-${i}`}
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
                  className={styles.input}
                  style={{
                    border:
                      !/^[0-9]+$/.test(sec.barsStr ?? String(sec.bars)) ||
                      parseInt(sec.barsStr ?? String(sec.bars), 10) < 1
                        ? `1px solid ${theme.palette.error.main}`
                        : undefined,
                  }}
                />
                {!/^[0-9]+$/.test(sec.barsStr ?? String(sec.bars)) ||
                parseInt(sec.barsStr ?? String(sec.bars), 10) < 1 ? (
                  <div className={styles.err} style={{ color: theme.palette.error.main }}>
                    Enter bars ≥1
                  </div>
                ) : null}
                <label htmlFor={`chords-${i}`} className={styles.small}>
                  Chords
                  <HelpIcon text="Chord progression, e.g., Cmaj7 Fmaj7" />
                </label>
                <input
                  id={`chords-${i}`}
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
                  className={clsx(styles.input, "mt-1")}
                />
              </div>
            ))}
          </div>
          <div className={styles.small}>
            Total Bars: {totalBars} — Est. Time: {estMinutes}:{estSecs}
          </div>
          </div>
        </details>

        {/* vibe controls */}
        <details className="mt-3" data-testid="vibe-section">
          <summary className="cursor-pointer text-xs opacity-80">Vibe</summary>
          <div className="mt-2">
            <VibeControls
              MOODS={MOODS}
              INSTR={INSTR}
              LEAD_INSTR={LEAD_INSTR}
              AMBI={AMBI}
              mood={mood}
              setMood={setMood}
              instruments={instruments}
              setInstruments={setInstruments}
              leadInstrument={leadInstrument}
              setLeadInstrument={setLeadInstrument}
              ambience={ambience}
              setAmbience={setAmbience}
              ambienceLevel={ambienceLevel}
              setAmbienceLevel={setAmbienceLevel}
            />
          </div>
        </details>

        {/* rhythm & feel */}
        <details className="mt-3" data-testid="rhythm-section">
          <summary className="cursor-pointer text-xs opacity-80">Rhythm</summary>
          <div className="mt-2">
            <RhythmControls
              DRUM_PATS={DRUM_PATS}
              drumPattern={drumPattern}
              setDrumPattern={setDrumPattern}
              variety={variety}
              setVariety={setVariety}
              chordSpanBeats={chordSpanBeats}
              setChordSpanBeats={setChordSpanBeats}
            />
          </div>
        </details>

        {/* polish accordion */}
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
        {/* album mode toggle */}
        <div className={styles.panel}>
          <label className={styles.toggle} htmlFor="albumMode">
            <input
              id="albumMode"
              type="checkbox"
              checked={albumMode}
              onChange={(e) => setAlbumMode(e.target.checked)}
            />
            <span className={styles.small}>
              Album mode
              <HelpIcon text="Render multiple tracks as an album" />
            </span>
          </label>
          {albumMode && (
            <>
              <label htmlFor="trackCount" className={styles.label}>
                Track Count
                <HelpIcon text="Number of tracks in album mode (3–12)" />
              </label>
              <input
                id="trackCount"
                type="number"
                min={3}
                max={12}
                value={trackCount}
                onChange={(e) =>
                  setTrackCount(
                    Math.max(3, Math.min(12, Number(e.target.value || 3)))
                  )
                }
                className={styles.input}
              />
              <label htmlFor="albumName" className={styles.label}>
                Album Name
                <HelpIcon text="Name for the album" />
              </label>
              <input
                id="albumName"
                className={styles.input}
                placeholder="Album name"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
              />
              {trackNames.map((name, i) => (
                <div key={i}>
                  <label htmlFor={`track-${i}`} className={styles.label}>
                    Track {i + 1} Name
                    <HelpIcon text="Optional track title" />
                  </label>
                  <input
                    id={`track-${i}`}
                    className={styles.input}
                    placeholder={`Track ${i + 1} name`}
                    value={name}
                    onChange={(e) => {
                      const arr = [...trackNames];
                      arr[i] = e.target.value;
                      setTrackNames(arr);
                    }}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <BatchActions
          numSongs={numSongs}
          setNumSongs={setNumSongs}
          titleSuffixMode={titleSuffixMode}
          setTitleSuffixMode={setTitleSuffixMode}
          bpmJitterPct={bpmJitterPct}
          setBpmJitterPct={setBpmJitterPct}
          playLast={playLast}
          setPlayLast={setPlayLast}
          busy={busy}
          outDir={outDir}
          titleBase={titleBase}
          hasInvalidBars={hasInvalidBars}
          albumMode={albumMode}
          albumReady={albumReady}
          onRender={handleRender}
          previewPlaying={previewPlaying}
          onPreview={handlePreview}
          isPlaying={isPlaying}
          onPlayLastTrack={handlePlayLastTrack}
        />

        {globalStatus && <div className={styles.status}>Status: {globalStatus}</div>}
        {busy && (
          <div className={styles.progressOuter}>
            <div className={styles.progressInner} style={{ width: `${progress}%` }} />
          </div>
        )}
        {err && (
          <div className={styles.err} style={{ color: theme.palette.error.main }}>
            Error: {friendlyError(err)}
          </div>
        )}

        {jobs.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Job ID</th>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Key</th>
                <th className={styles.th}>BPM</th>
                <th className={styles.th}>Seed</th>
                <th className={styles.th}>Progress</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Output</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className={styles.td}>{j.id}</td>
                  <td className={styles.td}>{j.title}</td>
                  <td className={styles.td}>{showKey(j.spec.key)}</td>
                  <td className={styles.td}>{j.spec.bpm}</td>
                  <td className={styles.td}>{j.spec.seed}</td>
                  <td className={styles.td}>
                    <div className={styles.progressOuter} style={{ marginTop: 0 }}>
                      <div
                        className={styles.progressInner}
                        style={{ width: `${j.progress ?? 0}%` }}
                      />
                    </div>
                  </td>
                  <td className={styles.td}>
                    {j.error ? (
                      <span style={{ color: theme.palette.error.main }}>
                        {friendlyError(j.error)}
                      </span>
                    ) : (
                      j.status || "—"
                    )}
                    {j.error && (
                      <details className="mt-1">
                        <summary className="opacity-80 cursor-pointer">details</summary>
                        <pre className="whitespace-pre-wrap">{j.error}</pre>
                      </details>
                    )}
                  </td>
                  <td className={styles.td}>
                    {j.outPath ? (
                      <div className="flex items-center gap-2">
                        <Waveform src={convertFileSrc(j.outPath!.replace(/\\/g, "/"))} />
                        <button
                          className={styles.playBtn}
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
        {jobs.some((j) => j.outPath) && (
          <div className={styles.nextSteps}>
            <span className={styles.small}>Next steps:</span>
            <button className={styles.playBtn} onClick={handlePlayLastTrack}>
              Listen
            </button>
            <button className={styles.btn} onClick={openOutputFolder}>
              Open folder
            </button>
            <button className={styles.btn} onClick={handleCopyLast}>
              Copy path
            </button>
            <HelpIcon text="Open the output folder, listen, or share the file path" />
          </div>
        )}
        {albumMode && albumImagePrompt && (
          <div className={styles.albumArt}>
            <div className={styles.small}>Album art prompt:</div>
            <div className={styles.promptBox}>{albumImagePrompt}</div>
            {albumImageUrl && (
              <img
                src={albumImageUrl}
                alt="Album art preview"
                className={styles.artPreview}
              />
            )}
          </div>
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

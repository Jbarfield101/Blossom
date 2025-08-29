import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Alert,
  Snackbar,
  LinearProgress,
  Button,
  TextField,
  Stack,
  FormControl,
  FormControlLabel,
  Checkbox,
  Slider,
  Divider,
} from "@mui/material";
import { loadSfz } from "../utils/sfzLoader";
import { useTasks } from "../store/tasks";

/**
 * Describes a logical song section used when generating music.
 */
interface Section {
  /** Label for the section (e.g., "A", "B", "Verse"). */
  name: string;
  /** Number of bars (measures) this section spans. */
  bars: number;
  /** Chord symbols for this section in order of progression. */
  chords: string[];
}

/**
 * Specification passed to the music generation task.
 * Contains all configurable properties for rendering a song.
 */
interface SongSpec {
  /** Human‑readable song title (also used in output filenames). */
  title: string;
  /** Directory path where rendered audio and artifacts are written. */
  outDir: string;
  /** Tempo in beats per minute. */
  bpm: number;
  /** Arrangement describing sections and harmony. */
  structure: Section[];
  /** Optional list of additional instruments to include. */
  instruments: string[];
  /** Optional list of ambience/texture layers to include. */
  ambience: string[];
  /** Drum pattern descriptor or preset name. */
  drum_pattern: string;
  /** Absolute or file URL path to the selected SFZ instrument. */
  sfz_instrument?: string;
  /** Enable a lofi/low‑pass coloration on the output. */
  lofi_filter: boolean;
  /** Apply a simple reverb effect after rendering. */
  reverb: boolean;
  /** Optional path to a MIDI file guiding the generation. */
  midi_file?: string;
  /** Overall output gain multiplier (0–1). */
  gain?: number;
  /** Optional RNG seed for reproducible generation. */
  seed?: number;
}

export default function SFZSongForm() {
  const [title, setTitle] = useState("");
  const [outDir, setOutDir] = useState("");
  const [sfzInstrument, setSfzInstrument] = useState<string | null>(null);
  const [midiFile, setMidiFile] = useState<string | null>(
      () => localStorage.getItem("midiFile")
    );
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<string | null>(null);
  const [lofiFilter, setLofiFilter] = useState(() => {
    const stored = localStorage.getItem("lofiFilter");
    return stored === null ? false : stored === "true";
  });
  const [reverb, setReverb] = useState(() => {
    const stored = localStorage.getItem("reverb");
    return stored === null ? false : stored === "true";
  });
  const [error, setError] = useState<string | null>(null);
  const [gain, setGain] = useState(1);
  const [toast, setToast] = useState<
    { message: string; severity: "success" | "error" } | null
  >(null);
  const tasks = useTasks();

  function mapLoaderError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unable to load SFZ")) {
      const status = msg.match(/HTTP (\d+)/)?.[1];
      if (msg.includes("file not found") || status === "404") {
        return "SFZ file not found";
      }
      return status ? `Failed to load SFZ (HTTP ${status})` : "Failed to load SFZ";
    }
    if (msg.includes("Failed to load sample")) {
      return "Failed to load a sample file referenced by the SFZ";
    }
    return msg;
  }

  function handleError(e: unknown) {
    console.error(e);
    setError(mapLoaderError(e));
  }

  async function pickFolder() {
    try {
      const dir = await openDialog({ directory: true, multiple: false });
      if (dir) {
        const chosen = dir as string;
        setOutDir(chosen);
        localStorage.setItem("sfzOutDir", chosen);
        invoke("save_paths", { sfz_out_dir: chosen }).catch((e) =>
          console.error(e)
        );
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function pickMidiFile() {
    try {
      const file = await openDialog({
        multiple: false,
        filters: [{ name: "MIDI File", extensions: ["mid", "midi"] }],
      });
      if (file) {
        const chosen = file as string;
        setMidiFile(chosen);
        localStorage.setItem("midiFile", chosen);
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function loadInstrument(path: string) {
    const normalized = path.replace(/\\/g, "/");
    setLoading(true);
    setProgress(0);
    setStatus(null);
    setError(null);
    // Always remember the chosen instrument so generation can proceed.
    setSfzInstrument(normalized);
    localStorage.setItem("sfzInstrument", normalized);
    try {
      // Best-effort preview load in the UI. If this fails (e.g., samples not bundled),
      // the Python renderer will still synthesize using a fallback sampler.
      await loadSfz(convertFileSrc(normalized), (loaded, total) => {
        setProgress(total ? loaded / total : 0);
      });
      setStatus(`Loaded instrument: ${normalized}`);
    } catch (e) {
      console.warn(e);
      setStatus("Instrument selected. Preview skipped; renderer will handle loading.");
      // Do not surface a blocking error here; allow Generate to remain enabled.
    } finally {
      setLoading(false);
    }
  }

  async function pickSfzInstrument() {
    try {
      const file = await openDialog({
        multiple: false,
        filters: [{ name: "SFZ Instrument", extensions: ["sfz"] }],
      });
      if (file) {
        await loadInstrument(file as string);
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function loadAcousticGrand() {
    try {
      // Use the bundled minimal example. Full piano sets may be added by users.
      const path = await resolveResource("sfz_sounds/piano.sfz");
      await loadInstrument(path);
    } catch (e) {
      handleError(e);
    }
  }

  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem("sfzInstrument");
      if (stored) {
        await loadInstrument(stored);
      } else {
        await loadAcousticGrand();
      }
    }
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem("lofiFilter", String(lofiFilter));
  }, [lofiFilter]);

  useEffect(() => {
    localStorage.setItem("reverb", String(reverb));
  }, [reverb]);

  useEffect(() => {
    async function initOutDir() {
      try {
        const cfg = (await invoke("load_paths")) as {
          sfz_out_dir?: string;
        };
        if (cfg.sfz_out_dir) {
          setOutDir(cfg.sfz_out_dir);
          localStorage.setItem("sfzOutDir", cfg.sfz_out_dir);
        } else {
          const stored = localStorage.getItem("sfzOutDir");
          if (stored) setOutDir(stored);
        }
      } catch {
        const stored = localStorage.getItem("sfzOutDir");
        if (stored) setOutDir(stored);
      }
    }
    initOutDir();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<string>("basic_sfz_progress", (e) => {
          try {
            const data = JSON.parse(e.payload);
            const { stage, message } = data;
            if (stage === "done") {
              setStatus(null);
              setToast({ message, severity: "success" });
            } else if (stage === "error") {
              setStatus(null);
              setToast({ message, severity: "error" });
            } else {
              setStatus(message);
            }
          } catch {
            setStatus(e.payload);
          }
        });
      } catch (e) {
        console.error("Failed to subscribe to progress events", e);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  const spec = useMemo(
      (): SongSpec => ({
        title, // Song title
        outDir, // Output directory for generated files
        bpm: 64, // Tempo in BPM (fixed for now)
        structure: [{ name: "A", bars: 8, chords: ["Cmaj7"] }], // Sections + harmony
        instruments: [], // Additional instrument layers (unused in current UI)
        ambience: [], // Ambient textures (unused in current UI)
        drum_pattern: "", // Drum pattern descriptor (unused in current UI)
        sfz_instrument: sfzInstrument || undefined, // Selected SFZ path
        lofi_filter: lofiFilter, // Apply lofi coloration
        reverb, // Apply simple reverb
        midi_file: midiFile || undefined, // Optional MIDI file path
        gain, // Output gain multiplier
      }),
      [title, outDir, sfzInstrument, lofiFilter, reverb, midiFile, gain]
    );

  function generate() {
    const seed = Math.floor(Math.random() * 2 ** 32);
    tasks.enqueueTask("Music Generation", {
      id: "GenerateSong",
      spec: { ...spec, seed },
    });
  }

  return (
    <Stack spacing={3} divider={<Divider flexItem />}>
      <Stack spacing={2}>
        <FormControl fullWidth>
          <TextField
            label="Title"
            placeholder="Enter song title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
        </FormControl>
        <FormControl>
          <Button variant="outlined" onClick={pickFolder} fullWidth>
            {outDir ? `Output: ${outDir}` : "Choose Output Folder"}
          </Button>
        </FormControl>
        <FormControl>
          <Button variant="outlined" onClick={pickMidiFile} fullWidth>
            {midiFile ? `MIDI: ${midiFile}` : "Choose MIDI File"}
          </Button>
        </FormControl>
      </Stack>

      <Stack spacing={2}>
        <Stack spacing={1} direction={{ xs: "column", sm: "row" }}>
          <Button
            variant="outlined"
            onClick={pickSfzInstrument}
            disabled={loading}
            fullWidth
          >
            {sfzInstrument ? "Change SFZ" : "Pick SFZ Instrument"}
          </Button>
          <Button
            variant="outlined"
            onClick={loadAcousticGrand}
            disabled={loading}
            fullWidth
          >
            Load Acoustic Grand
          </Button>
        </Stack>
        {loading && (
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{ my: 1 }}
          />
        )}
        {!loading && status && <div>{status}</div>}
      </Stack>

      <Stack spacing={2}>
        <FormControl>
          <Stack spacing={1}>
            <div>Gain</div>
            <Slider
              value={gain}
              onChange={(_, v) => setGain(v as number)}
              min={0}
              max={1}
              step={0.01}
              aria-label="Gain"
            />
          </Stack>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={reverb}
              onChange={(e) => setReverb(e.target.checked)}
            />
          }
          label="Reverb"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={lofiFilter}
              onChange={(e) => setLofiFilter(e.target.checked)}
            />
          }
          label="Lofi Filter"
        />
        <Button
          variant="contained"
          onClick={generate}
          disabled={!title || !outDir || !sfzInstrument || loading}
        >
          Generate
        </Button>
      </Stack>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || "success"}
          sx={{ width: "100%" }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}


import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Alert, Snackbar, LinearProgress } from "@mui/material";
import { loadSfz } from "../utils/sfzLoader";
import { useTasks } from "../store/tasks";

interface Section {
  name: string;
  bars: number;
  chords: string[];
}

interface SongSpec {
  title: string;
  outDir: string;
  bpm: number;
  structure: Section[];
  instruments: string[];
  ambience: string[];
  drum_pattern: string;
  sfz_instrument?: string;
  lofi_filter: boolean;
  seed?: number;
}

export default function SFZSongForm() {
  const [title, setTitle] = useState("");
  const [outDir, setOutDir] = useState("");
  const [sfzInstrument, setSfzInstrument] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [lofiFilter, setLofiFilter] = useState(() => {
    const stored = localStorage.getItem("lofiFilter");
    return stored === null ? false : stored === "true";
  });
  const [error, setError] = useState<string | null>(null);
  const tasks = useTasks();

  async function pickFolder() {
    try {
      const dir = await openDialog({ directory: true, multiple: false });
      if (dir) setOutDir(dir as string);
    } catch (e) {
      console.error(e);
      setError(String(e));
    }
  }

  async function loadInstrument(path: string) {
    const normalized = path.replace(/\\/g, "/");
    setLoading(true);
    setProgress(0);
    setStatus(null);
    try {
      await loadSfz(convertFileSrc(normalized), (loaded, total) => {
        setProgress(total ? loaded / total : 0);
      });
      setSfzInstrument(normalized);
      localStorage.setItem("sfzInstrument", normalized);
      setStatus(`Loaded instrument: ${normalized}`);
    } catch (e) {
      console.error(e);
      setError(String(e));
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
      console.error(e);
      setError(String(e));
    }
  }

  async function loadAcousticGrand() {
    try {
      const path = await resolveResource(
        "sfz_sounds/UprightPianoKW-20220221.sfz"
      );
      await loadInstrument(path);
    } catch (e) {
      console.error(e);
      setError(String(e));
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

  const spec = useMemo((): SongSpec => ({
    title,
    outDir,
    bpm: 64,
    structure: [{ name: "A", bars: 8, chords: ["Cmaj7"] }],
    instruments: [],
    ambience: [],
    drum_pattern: "",
    sfz_instrument: sfzInstrument || undefined,
    lofi_filter: lofiFilter,
  }), [title, outDir, sfzInstrument, lofiFilter]);

  function generate() {
    const seed = Math.floor(Math.random() * 2 ** 32);
    tasks.enqueueTask("Music Generation", {
      id: "GenerateSong",
      spec: { ...spec, seed },
    });
  }

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />
      <button onClick={pickFolder}>
        {outDir ? `Output: ${outDir}` : "Choose Output Folder"}
      </button>
      <button onClick={pickSfzInstrument} disabled={loading}>
        {sfzInstrument ? "Change SFZ" : "Pick SFZ Instrument"}
      </button>
      <button onClick={loadAcousticGrand} disabled={loading}>
        Load Acoustic Grand
      </button>
      {loading && (
        <LinearProgress
          variant="determinate"
          value={progress * 100}
          sx={{ my: 1 }}
        />
      )}
      {!loading && status && <div>{status}</div>}
      <label>
        <input
          type="checkbox"
          checked={lofiFilter}
          onChange={(e) => setLofiFilter(e.target.checked)}
        />
        Lofi Filter
      </label>
      <button
        onClick={generate}
        disabled={!title || !outDir || !sfzInstrument || loading}
      >
        Generate
      </button>
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
    </div>
  );
}


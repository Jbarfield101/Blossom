import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { Alert, Snackbar } from "@mui/material";
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

  async function pickSfzInstrument() {
    try {
      const file = await openDialog({
        multiple: false,
        filters: [{ name: "SFZ Instrument", extensions: ["sfz"] }],
      });
      if (file) {
        setSfzInstrument(file as string);
        localStorage.setItem("sfzInstrument", file as string);
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
      setSfzInstrument(path);
      localStorage.setItem("sfzInstrument", path);
    } catch (e) {
      console.error(e);
      setError(String(e));
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem("sfzInstrument");
    if (stored) {
      setSfzInstrument(stored);
    } else {
      loadAcousticGrand();
    }
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
      <button onClick={pickSfzInstrument}>
        {sfzInstrument ? "Change SFZ" : "Pick SFZ Instrument"}
      </button>
      <button onClick={loadAcousticGrand}>Load Acoustic Grand</button>
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
        disabled={!title || !outDir || !sfzInstrument}
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


import { useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
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
}

export default function SFZSongForm() {
  const [title, setTitle] = useState("");
  const [outDir, setOutDir] = useState("");
  const [sfzInstrument, setSfzInstrument] = useState<string | null>(null);
  const tasks = useTasks();

  async function pickFolder() {
    try {
      const dir = await openDialog({ directory: true, multiple: false });
      if (dir) setOutDir(dir as string);
    } catch (e) {
      console.error(e);
    }
  }

  async function pickSfzInstrument() {
    try {
      const file = await openDialog({
        multiple: false,
        filters: [{ name: "SFZ Instrument", extensions: ["sfz"] }],
      });
      if (file) setSfzInstrument(file as string);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadAcousticGrand() {
    try {
      const path = await resolveResource(
        "sfz_sounds/UprightPianoKW-20220221.sfz"
      );
      setSfzInstrument(path);
    } catch (e) {
      console.error(e);
    }
  }

  const spec = useMemo((): SongSpec => ({
    title,
    outDir,
    bpm: 60,
    structure: [{ name: "A", bars: 8, chords: ["Cmaj7"] }],
    instruments: [],
    ambience: [],
    drum_pattern: "",
    sfz_instrument: sfzInstrument || undefined,
  }), [title, outDir, sfzInstrument]);

  function generate() {
    tasks.enqueueTask("Music Generation", { id: "GenerateSong", spec });
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
      <button
        onClick={generate}
        disabled={!title || !outDir || !sfzInstrument}
      >
        Generate
      </button>
    </div>
  );
}


import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Section { name: string; bars: number; }
interface SongSpec {
  title: string;
  outDir: string;
  bpm: number;
  key: string;
  structure: Section[];
  mood: string[];
  instruments: string[];
  ambience: string[];
  seed: number;
}

const MOODS = ["chill", "happy", "sad"];
const INSTRUMENTS = ["piano", "guitar", "sax"];
const AMBIENCE = ["rain", "vinyl", "fire"];
const KEYS = ["C", "D", "E", "F", "G", "A", "B"];

export default function SongForm() {
  const [title, setTitle] = useState("My Song");
  const [outDir, setOutDir] = useState("");
  const [bpm, setBpm] = useState(80);
  const [key, setKey] = useState("C");
  const [structure, setStructure] = useState<Section[]>([
    { name: "Intro", bars: 4 },
    { name: "A", bars: 16 },
    { name: "B", bars: 16 },
    { name: "A", bars: 16 },
    { name: "Outro", bars: 8 },
  ]);
  const [mood, setMood] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [ambience, setAmbience] = useState<string[]>([]);
  const [seed, setSeed] = useState<number>(0);
  const [status, setStatus] = useState("idle");
  const [busy, setBusy] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, item: string) => {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const pickOutDir = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setOutDir(dir);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 1_000_000));

  const render = async () => {
    setBusy(true);
    setStatus("starting");
    const spec: SongSpec = {
      title,
      outDir,
      bpm,
      key,
      structure,
      mood,
      instruments,
      ambience,
      seed,
    };
    const unlisten = await listen<string>("lofi_progress", (e) => {
      setStatus(String(e.payload));
    });
    try {
      const saved = await invoke<string>("run_lofi_song", { spec });
      setStatus(`saved: ${saved}`);
    } catch (e: any) {
      setStatus(`error: ${e}`);
    } finally {
      unlisten();
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 600 }}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Output Folder
        <div style={{ display: "flex", gap: 8 }}>
          <input value={outDir} readOnly style={{ flex: 1 }} />
          <button onClick={pickOutDir}>Choose</button>
        </div>
      </label>
      <label>
        BPM
        <input type="number" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value) || 0)} />
      </label>
      <div>
        Key
        <div style={{ display: "flex", gap: 6 }}>
          {KEYS.map((k) => (
            <label key={k}>
              <input type="radio" name="key" value={k} checked={key === k} onChange={() => setKey(k)} />{k}
            </label>
          ))}
        </div>
      </div>
      <div>
        Structure
        {structure.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 60 }}>{s.name}</span>
            <input
              type="number"
              value={s.bars}
              onChange={(e) => {
                const n = [...structure];
                n[i] = { ...n[i], bars: parseInt(e.target.value) || 0 };
                setStructure(n);
              }}
            />
            <span>bars</span>
          </div>
        ))}
      </div>
      <div>
        Mood
        {MOODS.map((m) => (
          <label key={m} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={mood.includes(m)}
              onChange={() => toggle(mood, setMood, m)}
            />
            {m}
          </label>
        ))}
      </div>
      <div>
        Instruments
        {INSTRUMENTS.map((m) => (
          <label key={m} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={instruments.includes(m)}
              onChange={() => toggle(instruments, setInstruments, m)}
            />
            {m}
          </label>
        ))}
      </div>
      <div>
        Ambience
        {AMBIENCE.map((m) => (
          <label key={m} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={ambience.includes(m)}
              onChange={() => toggle(ambience, setAmbience, m)}
            />
            {m}
          </label>
        ))}
      </div>
      <label>
        Seed
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
          />
          <button type="button" onClick={randomizeSeed}>
            Randomize
          </button>
        </div>
      </label>
      <button onClick={render} disabled={busy}>
        {busy ? "Rendering..." : "Render Song"}
      </button>
      <div>Status: {status}</div>
    </div>
  );
}

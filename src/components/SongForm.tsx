// src/components/SongForm.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Section = { name: string; bars: number };
type SongSpec = {
  title: string;
  outDir: string;
  bpm: number;
  key: string;            // "C".."B" (Python also tolerates "Auto" if you later add it)
  structure: Section[];
  mood: string[];
  instruments: string[];
  ambience: string[];
  seed: number;
};

type Job = {
  id: string;
  title: string;
  spec: SongSpec;
  status: string;
  outPath?: string;
  error?: string;
};

const KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const MOODS = ["calm", "melancholy", "cozy", "hopeful", "nostalgic"];
const INSTR = [
  "rhodes",
  "nylon guitar",
  "upright bass",
  "pads",
  "electric piano",
  "clean electric guitar",
  "airy pads",
];
const AMBI = ["rain", "cafe"];

export default function SongForm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // THEME (applies to all songs)
  const [titleBase, setTitleBase] = useState("Midnight Coffee");
  const [outDir, setOutDir] = useState(localStorage.getItem('outDir') ?? '');
  const [bpm, setBpm] = useState(80);
  const [key, setKey] = useState<string>("C");
  const [mood, setMood] = useState<string[]>(["calm", "nostalgic"]);
  const [instruments, setInstruments] = useState<string[]>(["rhodes", "nylon guitar", "upright bass"]);
  const [ambience, setAmbience] = useState<string[]>(["rain"]);
  const [structure, setStructure] = useState<Section[]>([
    { name: "Intro", bars: 4 },
    { name: "A", bars: 16 },
    { name: "B", bars: 16 },
    { name: "A", bars: 16 },
    { name: "Outro", bars: 8 },
  ]);

  // VARIATION / BATCH
  const [numSongs, setNumSongs] = useState(3);
  const [titleSuffixMode, setTitleSuffixMode] = useState<"number" | "timestamp">("number");
  const [seedBase, setSeedBase] = useState(12345);
  const [seedMode, setSeedMode] = useState<"increment" | "random">("random");
  const [autoKeyPerSong, setAutoKeyPerSong] = useState(false);
  const [bpmJitterPct, setBpmJitterPct] = useState(5); // +/- %
  const [playLast, setPlayLast] = useState(true);

  // UI state
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [globalStatus, setGlobalStatus] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // one audio element
  useEffect(() => {
    const a = new Audio();
    a.addEventListener("ended", () => setIsPlaying(false));
    a.addEventListener("error", () => setErr("Audio playback error"));
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  // persist output directory across sessions
  useEffect(() => {
    localStorage.setItem('outDir', outDir);
    return () => {
      localStorage.setItem('outDir', outDir);
    };
  }, [outDir]);

  // progress listener from backend — attach to the "currently running" job
  const runningJobId = useMemo(
    () => jobs.find((j) => !j.error && !j.outPath)?.id,
    [jobs]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await listen("lofi_progress", (e) => {
        try {
          const raw =
            typeof e.payload === "string"
              ? e.payload
              : JSON.stringify(e.payload);
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
        localStorage.setItem('outDir', dir as string);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
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
    if (!autoKeyPerSong) return key;
    const idx = (i + Math.floor(seedBase % KEYS.length)) % KEYS.length;
    return KEYS[idx];
  }

  function jitterBpm(i: number): number {
    const pct = Math.max(0, Math.min(50, bpmJitterPct));
    if (pct === 0) return bpm;
    const rnd = mulberry32(seedBase + i)();
    const sign = rnd < 0.5 ? -1 : 1;
    const amount = Math.round((bpm * pct * 0.01) * (0.5 + Math.abs(rnd - 0.5)));
    return Math.max(40, Math.min(160, bpm + sign * amount));
  }

  function pickSeed(i: number): number {
    if (seedMode === "random") {
      return Math.floor(mulberry32(seedBase + i)() * 1_000_000_000);
    }
    return seedBase + i;
  }

  function makeSpecForIndex(i: number): SongSpec {
    return {
      title: buildTitle(i),
      outDir,
      bpm: jitterBpm(i),
      key: pickKey(i),
      structure,
      mood,
      instruments,
      ambience,
      seed: pickSeed(i),
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

    // Build all jobs upfront (so UI shows the list)
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
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: "starting…" } : j))
        );
        try {
          const outPath = await invoke<string>("run_lofi_song", { spec: job.spec });
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, outPath, status: "done" } : j
            )
          );
        } catch (e: any) {
          const message = e?.message || String(e);
          console.error("run_lofi_song failed:", e);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, status: "error", error: message } : j
            )
          );
          // keep going with the rest
        }
      }

      // auto‑play the last successful render
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

  // read latest jobs state inside async
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

        {/* title + output folder */}
        <div style={S.row}>
          <input
            style={S.input}
            placeholder="Song title base"
            value={titleBase}
            onChange={(e) => setTitleBase(e.target.value)}
          />
          <button style={S.btn} onClick={pickFolder}>
            {outDir ? "Change folder" : "Choose folder"}
          </button>
        </div>
        <div style={S.small}>{outDir || "No output folder selected"}</div>

        {/* core knobs */}
        <div style={S.grid3}>
          <div style={S.panel}>
            <label style={S.label}>BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value || 80))}
              style={S.input}
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
              <input type="checkbox" checked={autoKeyPerSong} onChange={(e) => setAutoKeyPerSong(e.target.checked)} />
              <span style={S.small}>Randomize key per song (on‑theme rotation)</span>
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
                <input
                  type="radio"
                  name="seedmode"
                  checked={seedMode === "increment"}
                  onChange={() => setSeedMode("increment")}
                />{" "}
                Increment (base + i)
              </label>
              <label style={{ ...S.small, flex: 1 }}>
                <input
                  type="radio"
                  name="seedmode"
                  checked={seedMode === "random"}
                  onChange={() => setSeedMode("random")}
                />{" "}
                Deterministic random
              </label>
            </div>
          </div>
        </div>

        {/* structure editor */}
        <div style={{ ...S.panel, marginTop: 12 }}>
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
                  }}
                  style={S.input}
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
                  <button
                    key={m}
                    onClick={() => setMood((prev) => toggle(prev, m))}
                    style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}
                  >
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
                  <button
                    key={i}
                    onClick={() => setInstruments((prev) => toggle(prev, i))}
                    style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}
                  >
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
                  <button
                    key={a}
                    onClick={() => setAmbience((prev) => toggle(prev, a))}
                    style={{ ...S.chipBtn, ...(on ? S.chipOn : {}) }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* batch + variation */}
        <div style={S.grid2}>
          <div style={S.panel}>
            <label style={S.label}>How many songs?</label>
            <input
              type="number"
              min={1}
              value={numSongs}
              onChange={(e) => setNumSongs(Math.max(1, Number(e.target.value || 1)))}
              style={S.input}
            />
            <div style={{ ...S.small, marginTop: 8 }}>
              Titles will be suffixed with{" "}
              <select
                value={titleSuffixMode}
                onChange={(e) => setTitleSuffixMode(e.target.value as any)}
                style={{ ...S.input, padding: "4px 8px", display: "inline-block", width: 160, marginLeft: 6 }}
              >
                <option value="number"># (1, 2, 3…)</option>
                <option value="timestamp">timestamp</option>
              </select>
            </div>
          </div>

          <div style={S.panel}>
            <label style={S.label}>BPM Jitter (per song)</label>
            <input
              type="range"
              min={0}
              max={30}
              value={bpmJitterPct}
              onChange={(e) => setBpmJitterPct(Number(e.target.value))}
              style={S.slider}
            />
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
            disabled={busy || !outDir || !titleBase}
            onClick={renderBatch}
          >
            {busy ? "Rendering batch…" : "Render Songs"}
          </button>

          <button
            style={S.playBtn}
            onClick={async () => {
              const a = audioRef.current;
              if (!a?.src) return setErr("No track loaded.");
              if (isPlaying) { a.pause(); setIsPlaying(false); }
              else { await a.play(); setIsPlaying(true); }
            }}
          >
            {isPlaying ? "Pause" : "Play last track"}
          </button>
        </div>

        {/* global status + errors */}
        {globalStatus && <div style={S.status}>Status: {globalStatus}</div>}
        {err && <div style={S.err}>Error: {err}</div>}

        {/* job table */}
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
                          a.pause(); a.src = url; a.load(); await a.play(); setIsPlaying(true);
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
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// src/components/SongForm.tsx
import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Section = { name: string; bars: number };
type SongSpec = {
  title: string;
  outDir: string;
  bpm: number;
  key: string;
  structure: Section[];
  mood: string[];
  instruments: string[];
  ambience: string[];
  seed: number;
};

export default function SongForm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [spec, setSpec] = useState<SongSpec>({
    title: "Midnight Coffee",
    outDir: "",
    bpm: 80,
    key: "C",
    structure: [
      { name: "Intro", bars: 4 },
      { name: "A", bars: 16 },
      { name: "B", bars: 16 },
      { name: "A", bars: 16 },
      { name: "Outro", bars: 8 },
    ],
    mood: ["calm", "nostalgic"],
    instruments: ["rhodes", "dusty drums", "upright bass"],
    ambience: ["vinyl crackle"],
    seed: 12345,
  });

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // dedicated audio element
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

  // receive progress/status from backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await listen("lofi_progress", (e) => {
        try {
          const msg =
            typeof e.payload === "string"
              ? e.payload
              : JSON.stringify(e.payload);
          setStatus(msg);
        } catch {}
      });
      unlisten = off;
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  function toggle(list: string[], val: string) {
    return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
  }

  async function pickFolder() {
    try {
      const dir = await open({ directory: true, multiple: false });
      if (dir) setSpec((s) => ({ ...s, outDir: dir as string }));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function renderSong() {
    if (!spec.title || !spec.outDir) {
      setErr("Please set a title and choose an output folder.");
      return;
    }
    setErr(null);
    setBusy(true);
    setStatus("Starting…");
    setIsPlaying(false);

    try {
      const outPath = await invoke<string>("run_lofi_song", { spec });
      setStatus(`Saved: ${outPath}`);

      // load & play the result
      const url = convertFileSrc(outPath.replace(/\\/g, "/"));
      const a = audioRef.current!;
      a.pause();
      a.src = url;
      a.load();
      await a.play();
      setIsPlaying(true);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const S: Record<string, React.CSSProperties> = {
    card: {
      background: "#17181b",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 10px 24px rgba(0,0,0,.32)",
      color: "#fff",
    },
    h2: { margin: "0 0 10px 0", fontSize: 18, fontWeight: 700 },
    row: { display: "flex", gap: 8, alignItems: "center" },
    input: {
      flex: 1,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #2b2e33",
      background: "#0e0f12",
      color: "#e7e7ea",
      outline: "none",
    },
    btn: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "none",
      background: "#3a82f6",
      color: "#fff",
      cursor: "pointer",
      minWidth: 140,
    },
    small: { fontSize: 12, opacity: 0.75, marginTop: 4 },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0,1fr))",
      gap: 12,
      marginTop: 12,
    },
    panel: { background: "#0e0f12", borderRadius: 10, padding: 10 },
    label: { fontSize: 12, opacity: 0.8, marginBottom: 6, display: "block" },
    chips: { display: "flex", gap: 12, flexWrap: "wrap" },
    actions: { marginTop: 12, display: "flex", gap: 8 },
    status: { marginTop: 10, fontSize: 12, opacity: 0.8 },
    err: { marginTop: 8, color: "#ff7b7b", fontSize: 12 },
  };

  return (
    <div style={S.card}>
      <div style={S.h2}>Build a Lofi Song</div>

      {/* title + output folder */}
      <div style={S.row}>
        <input
          style={S.input}
          placeholder="Song title"
          value={spec.title}
          onChange={(e) => setSpec((s) => ({ ...s, title: e.target.value }))}
        />
        <button style={S.btn} onClick={pickFolder}>
          {spec.outDir ? "Change folder" : "Choose folder"}
        </button>
      </div>
      <div style={S.small}>{spec.outDir || "No output folder selected"}</div>

      {/* core options */}
      <div style={S.grid}>
        <div style={S.panel}>
          <label style={S.label}>BPM</label>
          <input
            type="number"
            value={spec.bpm}
            onChange={(e) =>
              setSpec((s) => ({ ...s, bpm: Number(e.target.value || 80) }))
            }
            style={S.input}
          />
        </div>
        <div style={S.panel}>
          <label style={S.label}>Key</label>
          <select
            value={spec.key}
            onChange={(e) => setSpec((s) => ({ ...s, key: e.target.value }))}
            style={{ ...S.input, padding: "8px 12px" }}
          >
            {["C", "D", "E", "F", "G", "A", "B"].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div style={S.panel}>
          <label style={S.label}>Seed</label>
          <input
            type="number"
            value={spec.seed}
            onChange={(e) =>
              setSpec((s) => ({ ...s, seed: Number(e.target.value || 0) }))
            }
            style={S.input}
          />
        </div>
      </div>

      {/* structure editor */}
      <div style={{ ...S.panel, marginTop: 12 }}>
        <label style={S.label}>Structure (bars)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {spec.structure.map((sec, i) => (
            <div
              key={i}
              style={{
                background: "#17191d",
                padding: 8,
                borderRadius: 8,
                minWidth: 110,
              }}
            >
              <div style={S.small}>{sec.name}</div>
              <input
                type="number"
                value={sec.bars}
                min={1}
                onChange={(e) => {
                  const bars = Math.max(1, Number(e.target.value || 1));
                  setSpec((s) => {
                    const structure = [...s.structure];
                    structure[i] = { ...structure[i], bars };
                    return { ...s, structure };
                  });
                }}
                style={S.input}
              />
            </div>
          ))}
        </div>
      </div>

      {/* checkbox groups */}
      <div style={{ ...S.grid, marginTop: 12 }}>
        <div style={S.panel}>
          <label style={S.label}>Mood</label>
          <div style={S.chips}>
            {["calm", "melancholy", "cozy", "hopeful", "nostalgic"].map(
              (m) => (
                <label key={m}>
                  <input
                    type="checkbox"
                    checked={spec.mood.includes(m)}
                    onChange={() =>
                      setSpec((s) => ({ ...s, mood: toggle(s.mood, m) }))
                    }
                  />{" "}
                  {m}
                </label>
              )
            )}
          </div>
        </div>

        <div style={S.panel}>
          <label style={S.label}>Instruments</label>
          <div style={S.chips}>
            {[
              "rhodes",
              "nylon guitar",
              "dusty drums",
              "upright bass",
              "pads",
            ].map((i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={spec.instruments.includes(i)}
                  onChange={() =>
                    setSpec((s) => ({
                      ...s,
                      instruments: toggle(s.instruments, i),
                    }))
                  }
                />{" "}
                {i}
              </label>
            ))}
          </div>
        </div>

        <div style={S.panel}>
          <label style={S.label}>Ambience</label>
          <div style={S.chips}>
            {["vinyl crackle", "rain", "cafe"].map((a) => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={spec.ambience.includes(a)}
                  onChange={() =>
                    setSpec((s) => ({
                      ...s,
                      ambience: toggle(s.ambience, a),
                    }))
                  }
                />{" "}
                {a}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* render / play */}
      <div style={S.actions}>
        <button
          style={S.btn}
          disabled={busy || !spec.outDir || !spec.title}
          onClick={renderSong}
        >
          {busy ? "Rendering…" : "Render Song"}
        </button>
        <button
          style={S.btn}
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
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <div style={S.status}>{status}</div>
      {err && <div style={S.err}>{err}</div>}
    </div>
  );
}

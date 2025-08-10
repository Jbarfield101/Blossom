import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export default function Music() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [prompt, setPrompt] = useState(
    "slow lo-fi beat, warm vinyl crackle, soft jazz chords"
  );

  // NEW controls
  const [lengthSec, setLengthSec] = useState(120); // full song length
  const [bpm, setBpm] = useState(82);
  const [style, setStyle] = useState<"lofi" | "jazz" | "ambient">("lofi");
  const [count, setCount] = useState(1);

  // progress
  const [progress, setProgress] = useState(0);

  // create and wire the audio element
  useEffect(() => {
    const a = new Audio();
    a.loop = true;

    const onError = () => {
      const e = (a as any).error as MediaError | null;
      const code = e?.code ?? 0;
      const map: Record<number, string> = {
        1: "MEDIA_ERR_ABORTED",
        2: "MEDIA_ERR_NETWORK",
        3: "MEDIA_ERR_DECODE",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
      };
      setErr(`Audio error: ${map[code] || "Unknown"} (code ${code})`);
    };
    const onEnded = () => setIsPlaying(false);

    a.addEventListener("error", onError);
    a.addEventListener("ended", onEnded);
    audioRef.current = a;

    return () => {
      a.pause();
      a.removeEventListener("error", onError);
      a.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  // listen to progress events from Rust
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await listen<number>("lofi_progress", (e) => {
        const p = Math.max(0, Math.min(100, Number(e.payload)));
        setProgress(p);
      });
      unlisten = off;
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.src) {
      setErr("No track loaded. Click Generate first.");
      return;
    }
    try {
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
      } else {
        await a.play();
        setIsPlaying(true);
      }
    } catch {
      setErr("Playback blocked. Click again or check output device.");
    }
  };

  const generate = async () => {
    setBusy(true);
    setErr(null);
    setIsPlaying(false);
    setProgress(0);

    try {
      // call the streaming command (returns string or string[])
      const res = await invoke<string | string[]>("lofi_generate_gpu_stream", {
        prompt,
        totalSeconds: lengthSec,
        bpm,
        style,
        count,
      });

      // use the first result for the player (you'll still get all files on disk)
      const firstPath = Array.isArray(res) ? res[0] : res;
      const url = convertFileSrc(firstPath.replace(/\\/g, "/"));

      const a = audioRef.current!;
      a.pause();
      a.srcObject = null;
      a.src = url;
      a.load();
      await a.play();
      setIsPlaying(true);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {/* prompt + generate */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={styles.input}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the vibe…"
          />
          <button onClick={generate} disabled={busy} style={styles.btn}>
            {busy ? `Composing… ${progress}%` : "Generate"}
          </button>
        </div>

        {/* controls */}
        <div style={styles.grid}>
          <label style={styles.field}>
            <span>Length (sec)</span>
            <input
              type="range"
              min={12}
              max={480}
              step={12}
              value={lengthSec}
              onChange={(e) => setLengthSec(+e.target.value)}
            />
            <small>{lengthSec}s</small>
          </label>

          <label style={styles.field}>
            <span>BPM</span>
            <input
              type="range"
              min={60}
              max={120}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(+e.target.value)}
            />
            <small>{bpm}</small>
          </label>

          <label style={styles.field}>
            <span>Style</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as any)}
              style={styles.select}
            >
              <option value="lofi">Lo‑Fi</option>
              <option value="jazz">Lo‑Fi Jazz</option>
              <option value="ambient">Ambient</option>
            </select>
          </label>

          <label style={styles.field}>
            <span>Count</span>
            <input
              type="number"
              min={1}
              max={8}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(8, +e.target.value || 1)))
              }
            />
          </label>
        </div>

        {/* progress bar */}
        {busy && (
          <div style={styles.progressOuter}>
            <div style={{ ...styles.progressInner, width: `${progress}%` }} />
          </div>
        )}

        {/* play/pause */}
        <button
          style={styles.play}
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        <div style={styles.status}>{isPlaying ? "Playing" : "Paused"}</div>
        {err && <div style={styles.err}>{err}</div>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    height: "100%",
    display: "grid",
    placeItems: "center",
    background: "#0f0f10",
    color: "#f2f2f2",
  },
  card: {
    width: "min(880px, 94vw)",
    background: "#17181b",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,.35)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 12,
    marginTop: 12,
  },
  field: { display: "grid", gap: 4, color: "#cfcfd2", fontSize: 12 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #2b2e33",
    background: "#0e0f12",
    color: "#e7e7ea",
    outline: "none",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#0e0f12",
    color: "#e7e7ea",
    border: "1px solid #2b2e33",
  },
  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#3a82f6",
    color: "#fff",
    cursor: "pointer",
    minWidth: 130,
  },
  progressOuter: {
    marginTop: 12,
    background: "#222",
    borderRadius: 8,
    height: 10,
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    background: "#3a82f6",
    transition: "width .2s ease",
  },
  play: {
    margin: "28px auto 8px",
    width: 88,
    height: 88,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "none",
    background: "#23252a",
    color: "#fff",
    fontSize: 28,
    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
    cursor: "pointer",
  },
  status: { textAlign: "center", opacity: 0.75 },
  err: { marginTop: 10, color: "#ff7b7b", fontSize: 12 },
};

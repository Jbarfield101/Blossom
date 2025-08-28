// src/pages/Comfy.tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { usePaths } from "../features/paths/usePaths";
import PromptManager from "../components/PromptManager";
import { useComfyTutorial } from "../features/comfyTutorial/useComfyTutorial";

export default function Comfy() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pingOk, setPingOk] = useState(false);
  const { comfyPath } = usePaths();
  const { showTutorial, setShowTutorial } = useComfyTutorial();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await listen<string>("comfy_log", (e) => {
        const msg = String(e.payload);
        setLog((prev) => (prev.length > 300 ? [...prev.slice(-300), msg] : [...prev, msg]));
        if (msg.includes("Uvicorn running on")) setPingOk(true);
      });
      unlisten = off;
    })();
    return () => { unlisten?.(); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await invoke<boolean>("comfy_status");
        setRunning(r);
      } catch {}
      if (running) {
        try {
          const ok = await fetch("http://127.0.0.1:8188/").then(r => r.ok).catch(() => false);
          setPingOk(ok);
        } catch { setPingOk(false); }
      }
    })();
  }, [running]);

  const start = async () => {
    try {
      await invoke("comfy_start", { dir: comfyPath });
      setRunning(true);
      setTimeout(() => setPingOk(true), 2000);
    } catch (e: any) {
      setLog((prev) => [...prev, `Start error: ${e?.message ?? e}`]);
    }
  };

  const stop = async () => {
    try {
      await invoke("comfy_stop");
      setRunning(false);
      setPingOk(false);
    } catch (e: any) {
      setLog((prev) => [...prev, `Stop error: ${e?.message ?? e}`]);
    }
  };

  return (
    <div style={styles.wrap}>
      {showTutorial && (
        <div style={styles.tut}>
          <h3 style={{ marginTop: 0 }}>ComfyUI</h3>
          <p style={{ marginTop: 4 }}>
            Blossom bundles ComfyUI and launches it automatically. Click Start to
            run the included server.
          </p>
          <button onClick={() => setShowTutorial(false)} style={styles.tutBtn}>Got it</button>
        </div>
      )}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>ComfyUI</h2>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Status: {running ? (pingOk ? "Running" : "Starting…") : "Stopped"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={start} disabled={running} style={styles.btn}>Start</button>
          <button onClick={stop} disabled={!running} style={styles.btnDanger}>Stop</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <PromptManager />
      </div>
      <div style={styles.grid}>
        <div style={styles.left}>
          {running && pingOk ? (
            <iframe
              title="ComfyUI"
              src="http://127.0.0.1:8188/"
              style={{ width: "100%", height: "100%", border: "1px solid #333", borderRadius: 10 }}
            />
          ) : (
            <div style={styles.placeholder}>
              {running ? "Starting ComfyUI…" : "Click Start to launch ComfyUI"}
            </div>
          )}
        </div>

        <div style={styles.right}>
          <div style={styles.logHead}>Logs</div>
          <div style={styles.logBox}>
            {log.map((l, i) => (<div key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: 16, color: "#eee" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 12
  },
  btn: {
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: "#3a82f6", color: "#fff", cursor: "pointer"
  },
  btnDanger: {
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: "#d9534f", color: "#fff", cursor: "pointer"
  },
  grid: {
    display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12,
    height: "calc(100vh - 110px)"
  },
  left: { background: "#121214", borderRadius: 10, overflow: "hidden" },
  right: { background: "#121214", borderRadius: 10, display: "flex", flexDirection: "column" },
  placeholder: { height: "100%", display: "grid", placeItems: "center", opacity: 0.7 },
  logHead: { padding: "8px 12px", borderBottom: "1px solid #333", fontSize: 12, opacity: 0.8 },
  logBox: { padding: 12, overflow: "auto", fontFamily: "ui-monospace, monospace", fontSize: 12, flex: 1 },
  tut: {
    background: "#222",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  tutBtn: {
    marginTop: 8,
    padding: "6px 10px",
    border: "none",
    borderRadius: 6,
    background: "#3a82f6",
    color: "#fff",
    cursor: "pointer",
  }
};

// src/pages/Comfy.tsx
import { useState } from "react";
import { FaDiceD20, FaImage } from "react-icons/fa";

// This page provides a simple UI scaffold for ComfyUI.
// The layout is split into two halves: the left side hosts
// a form with buttons, while the right side contains a
// preview area and a status panel.

export default function Comfy() {
  const [mode, setMode] = useState<"dnd" | "image">("dnd");

  const renderDnd = () => (
    <div style={styles.btnGroup}>
      <button style={styles.actionBtn}>Portrait</button>
      <button style={styles.actionBtn}>Icon</button>
      <button style={styles.actionBtn}>Sketches</button>
    </div>
  );

  const renderImage = () => (
    <div style={styles.btnGroup}>
      <button style={styles.actionBtn}>Create Scene</button>
      <button style={styles.actionBtn}>Create Video</button>
    </div>
  );

  return (
    <div style={styles.wrap}>
      <div style={styles.grid}>
        <div style={styles.left}>
          <div style={styles.iconBar}>
            <button
              style={mode === "dnd" ? styles.iconBtnActive : styles.iconBtn}
              onClick={() => setMode("dnd")}
              title="DND"
            >
              <FaDiceD20 />
            </button>
            <button
              style={mode === "image" ? styles.iconBtnActive : styles.iconBtn}
              onClick={() => setMode("image")}
              title="Image"
            >
              <FaImage />
            </button>
          </div>
          <div style={styles.section}>
            {mode === "dnd" ? renderDnd() : renderImage()}
          </div>
        </div>

        <div style={styles.right}>
          <div style={styles.preview}>Preview</div>
          <div style={styles.status}>Status: Ready</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: 16,
    color: "#eee",
    height: "100%",
    boxSizing: "border-box",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    height: "100%",
  },
  left: {
    background: "#121214",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    padding: 12,
    boxSizing: "border-box",
  },
  right: {
    background: "#121214",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  iconBar: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  iconBtn: {
    background: "#2a2a2d",
    border: "none",
    borderRadius: 6,
    padding: 8,
    color: "#ccc",
    cursor: "pointer",
  },
  iconBtnActive: {
    background: "#3a82f6",
    border: "none",
    borderRadius: 6,
    padding: 8,
    color: "#fff",
    cursor: "pointer",
  },
  section: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  actionBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: 8,
    background: "#3a82f6",
    color: "#fff",
    cursor: "pointer",
  },
  preview: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    borderBottom: "1px solid #333",
    color: "#888",
  },
  status: {
    padding: 12,
    fontSize: 14,
    opacity: 0.8,
  },
};


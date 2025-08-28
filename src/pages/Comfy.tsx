// src/pages/Comfy.tsx
import { FaDiceD20, FaImage } from "react-icons/fa";

export default function Comfy() {
  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <h2 style={{ marginTop: 0 }}>Comfy Form</h2>
        <div style={styles.section}>
          <button style={styles.iconBtn} aria-label="DND">
            <FaDiceD20 />
          </button>
          <div style={styles.buttonGroup}>
            <button style={styles.actionBtn}>Portrait</button>
            <button style={styles.actionBtn}>Icon</button>
            <button style={styles.actionBtn}>Sketches</button>
          </div>
        </div>
        <div style={styles.section}>
          <button style={styles.iconBtn} aria-label="Image">
            <FaImage />
          </button>
          <div style={styles.buttonGroup}>
            <button style={styles.actionBtn}>Create Scene</button>
            <button style={styles.actionBtn}>Create Video</button>
          </div>
        </div>
      </div>
      <div style={styles.previewWrap}>
        <div style={styles.preview}>Preview</div>
        <div style={styles.status}>Status: ready</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      height: "calc(100vh - var(--top-bar-height))",
      padding: 16,
      gap: 12,
      color: "#eee",
    },
  form: {
    background: "#121214",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: {
    border: "none",
    background: "#3a82f6",
    color: "#fff",
    borderRadius: 8,
    padding: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGroup: { display: "flex", gap: 8 },
  actionBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: 8,
    background: "#333",
    color: "#fff",
    cursor: "pointer",
  },
  previewWrap: {
    background: "#121214",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    flexDirection: "column",
  },
  preview: {
    flex: 1,
    border: "1px solid #333",
    borderRadius: 8,
    marginBottom: 16,
    display: "grid",
    placeItems: "center",
    opacity: 0.7,
  },
  status: {
    borderTop: "1px solid #333",
    paddingTop: 8,
    fontSize: 12,
    opacity: 0.8,
  },
};

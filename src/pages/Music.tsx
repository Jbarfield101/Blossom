// src/pages/Music.tsx
import SongForm from "../components/SongForm";
import VersionBadge from "../components/VersionBadge";

export default function Music() {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#0f0f10",
        color: "#fff",
        paddingBottom: 24,
      }}
    >
      {/* Version tag (top-right) */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <VersionBadge version="0.1.1" />
      </div>

      {/* Checkbox Song Builder only */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <SongForm />
      </div>
    </div>
  );
}

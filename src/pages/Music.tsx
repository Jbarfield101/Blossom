// src/pages/Music.tsx
import SongForm from "../components/SongForm";
import VersionBadge from "../components/VersionBadge";
import SystemInfoWidget from "../components/SystemInfoWidget";
import { Box } from "@mui/material";
import { systemInfoWidgetSx } from "./homeStyles";

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
        <VersionBadge />
      </div>

      {/* Checkbox Song Builder only */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <SongForm />
      </div>

      {/* System info widget */}
      <Box sx={systemInfoWidgetSx}>
        <SystemInfoWidget />
      </Box>
    </div>
  );
}

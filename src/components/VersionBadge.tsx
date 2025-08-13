// src/components/VersionBadge.tsx
import React from "react";

export default function VersionBadge({
  name = "Blossom",
  version = "0.1.3",
}: {
  name?: string;
  version?: string;
}) {
  const wrap: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "baseline",
    pointerEvents: "none",
  };
  const nameStyle: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: 0.3,
    textShadow: "0 2px 12px rgba(0,0,0,.45)",
  };
  const verStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    color: "#fff",
    opacity: 0.95,
    textShadow: "0 2px 12px rgba(0,0,0,.45)",
  };
  return (
    <div style={wrap}>
      <div style={nameStyle}>{name}</div>
      <div style={verStyle}>{version}</div>
    </div>
  );
}

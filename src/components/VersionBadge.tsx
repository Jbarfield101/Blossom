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
    flexDirection: "column",
    alignItems: "center",
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
    fontSize: 20,
    fontWeight: 700,
    color: "#00bcd4",
    textShadow: "0 2px 12px rgba(0,0,0,.45)",
  };
  return (
    <div style={wrap}>
      <div style={nameStyle}>{name}</div>
      <div style={verStyle}>Version {version}</div>
    </div>
  );
}

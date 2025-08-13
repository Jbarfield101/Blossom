import React from "react";

type Props = {
  appName?: string;
  version?: string;
  align?: "center" | "left"; // choose where to place it
};

export default function HeaderOverlay({
  appName = "Blossom",
  version = "0.1.3",
  align = "center",
}: Props) {
  const base: React.CSSProperties = {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: align === "center" ? "center" : "flex-start",
    pointerEvents: "none", // don't block clicks on your icons
  };
  const wrap: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "baseline",
    paddingLeft: align === "left" ? 16 : 0,
  };
  const nameStyle: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: 0.3,
    textShadow: "0 2px 12px rgba(0,0,0,.45)",
  };
  const versionStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    color: "#ffffff",
    opacity: 0.95,
    textShadow: "0 2px 12px rgba(0,0,0,.45)",
  };

  return (
    <div style={base}>
      <div style={wrap}>
        <div style={nameStyle}>{appName}</div>
        <div style={versionStyle}>{version}</div>
      </div>
    </div>
  );
}

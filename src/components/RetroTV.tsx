import React from "react";
import { useTheme } from "../features/theme/ThemeContext";

export default function RetroTV() {
  const { theme } = useTheme();
  if (theme !== "retro") return null;
  return (
    <div className="retro-tv-container">
      <div className="retro-tv-screen" />
    </div>
  );
}

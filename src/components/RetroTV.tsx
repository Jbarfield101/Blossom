import React from "react";
import { useTheme } from "../features/theme/ThemeContext";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  if (theme !== "retro") return null;
  return (
    <div className="retro-tv-container">
      <div className="retro-tv-screen">
        <div className="retro-tv-content">{children}</div>
      </div>
    </div>
  );
}

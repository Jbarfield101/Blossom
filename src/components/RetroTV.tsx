import React from "react";
import { useTheme } from "../features/theme/ThemeContext";

interface RetroTVProps {
  children?: React.ReactNode;
}

export default function RetroTV({ children }: RetroTVProps) {
  const { theme } = useTheme();
  if (theme !== "retro") return null;
  const content = children ? (
    <div className="retro-tv-content">{children}</div>
  ) : (
    <img
      src="/assets/logo.png"
      className="retro-tv-content"
      alt="Blossom logo"
    />
  );
  return (
    <div className="retro-tv-container">
      <div className="retro-tv-screen">{content}</div>
    </div>
  );
}

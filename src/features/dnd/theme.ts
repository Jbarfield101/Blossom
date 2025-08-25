import { type CSSProperties, createContext, useContext } from "react";
import { DndTheme } from "./types";

export const ACCENT_COLOR = "#39ff14";

export const themes: DndTheme[] = ["Parchment", "Cyberpunk"];

export const themeStyles: Record<DndTheme, CSSProperties> = {
  Parchment: {
    background: "#fdf5e6",
    color: "#3e2723",
    padding: "1rem",
    fontFamily: "serif",
  },
  Cyberpunk: {
    background: "#000",
    color: ACCENT_COLOR,
    padding: "1rem",
    fontFamily: "monospace",
  },
};

export const tabColors: Record<DndTheme, string> = {
  Parchment: "#f3e5ab",
  Cyberpunk: "#001a00",
};

export const DndThemeContext = createContext<DndTheme>("Parchment");

export const useDndTheme = () => useContext(DndThemeContext);

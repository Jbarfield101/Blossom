import { type CSSProperties, createContext, useContext } from "react";
import { DndTheme } from "./types";

export const themes: DndTheme[] = ["Parchment", "Ink", "Minimal"];

export const themeStyles: Record<DndTheme, CSSProperties> = {
  Parchment: {
    background: "#fdf5e6",
    padding: "1rem",
    fontFamily: "serif",
  },
  Ink: {
    background: "#fff",
    color: "#000",
    padding: "1rem",
    fontFamily: "monospace",
  },
  Minimal: {
    background: "#f0f0f0",
    padding: "1rem",
    fontFamily: "sans-serif",
  },
};

export const DndThemeContext = createContext<DndTheme>("Parchment");

export const useDndTheme = () => useContext(DndThemeContext);

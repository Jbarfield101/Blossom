import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "default" | "ocean" | "forest" | "sunset" | "sakura";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "ocean" || stored === "forest" || stored === "sunset" || stored === "sakura") {
      return stored;
    }
    return "default";
  });

  useEffect(() => {
    const classes = ["theme-default", "theme-ocean", "theme-forest", "theme-sunset", "theme-sakura"];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}


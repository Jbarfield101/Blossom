import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "light" | "dark";

const ACCENTS: Record<ThemeName, string> = {
  light: "#006064",
  dark: "#00bcd4",
};

const ThemeContext = createContext({
  theme: "dark" as ThemeName,
  accent: ACCENTS.dark,
  setTheme: (_t: ThemeName) => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const accent = ACCENTS[theme];

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

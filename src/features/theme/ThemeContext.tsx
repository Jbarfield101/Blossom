import { createContext, useContext, useEffect } from "react";
import { useUsers } from "../users/useUsers";

export type Theme = "default" | "ocean" | "forest" | "sunset" | "sakura";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].theme : "default";
  });
  const setTheme = useUsers((state) => state.setTheme);

  useEffect(() => {
    const classes = ["theme-default", "theme-ocean", "theme-forest", "theme-sunset", "theme-sakura"];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
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


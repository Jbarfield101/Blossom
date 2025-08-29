import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "../../theme";
import { useUsers } from "../users/useUsers";

export type Theme =
  | "default"
  | "forest"
  | "sunset"
  | "sakura"
  | "studio"
  | "galaxy"
  | "retro"
  | "noir"
  | "aurora"
  | "rainy"
  | "pastel"
  | "mono"
  | "eclipse"
  | "dnd";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUsers((state) => {
    const id = state.currentUserId;
    return id && state.users[id] ? state.users[id].theme : state.globalTheme;
  });
  const setTheme = useUsers((state) => state.setTheme);

  useEffect(() => {
    const classes = [
      "theme-default",
      "theme-forest",
      "theme-sunset",
      "theme-sakura",
      "theme-studio",
      "theme-galaxy",
      "theme-retro",
      "theme-noir",
      "theme-aurora",
      "theme-rainy",
      "theme-pastel",
      "theme-mono",
      "theme-eclipse",
      "theme-dnd",
    ];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  const muiTheme = useMemo(() => createAppTheme(), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
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


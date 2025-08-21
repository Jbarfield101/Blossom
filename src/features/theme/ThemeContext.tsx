import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  PaletteMode,
} from "@mui/material";
import { createAppTheme } from "../../theme";
import { useUsers } from "../users/useUsers";

export type Theme =
  | "default"
  | "ocean"
  | "forest"
  | "sunset"
  | "sakura"
  | "studio"
  | "galaxy";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].theme : "default";
  });
  const mode = useUsers((state) => {
    const id = state.currentUserId;
    return id ? state.users[id].mode : "dark";
  });
  const setTheme = useUsers((state) => state.setTheme);
  const setMode = useUsers((state) => state.setMode);

  useEffect(() => {
    const classes = [
      "theme-default",
      "theme-ocean",
      "theme-forest",
      "theme-sunset",
      "theme-sakura",
      "theme-studio",
      "theme-galaxy",
    ];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const muiTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode }}>
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


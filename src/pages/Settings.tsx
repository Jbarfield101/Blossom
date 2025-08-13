import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useCalendar } from "../features/calendar/useCalendar";
import { useTheme, ThemeName } from "../theme";

export default function Settings() {
  const { events, selectedCountdownId, setSelectedCountdownId } = useCalendar();
  const countdownEvents = events.filter((e) => e.hasCountdown);
  const { theme, setTheme } = useTheme();
  const themes: ThemeName[] = [
    "light",
    "dark",
    "chocolate",
    "galaxy",
    "forest",
    "synthwave",
  ];
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, minWidth: 360 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Put toggles, theme, and module switches here.
        </Typography>
        {countdownEvents.length > 0 && (
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel id="countdown-label">Home Countdown</InputLabel>
            <Select
              labelId="countdown-label"
              label="Home Countdown"
              value={selectedCountdownId ?? ""}
              onChange={(e) =>
                setSelectedCountdownId(e.target.value ? String(e.target.value) : null)
              }
            >
              <MenuItem value="">None</MenuItem>
              {countdownEvents.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel id="theme-label">Theme</InputLabel>
          <Select
            labelId="theme-label"
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeName)}
          >
            {themes.map((t) => (
              <MenuItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
}

import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useCalendar } from "../features/calendar/useCalendar";
import { Theme, useTheme } from "../features/theme/ThemeContext";
import { useScrapedItems } from "../features/scraper/useScrapedItems";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { events, selectedCountdownId, setSelectedCountdownId } = useCalendar();
  const { notificationsEnabled, setNotificationsEnabled } = useScrapedItems();
  const countdownEvents = events.filter(
    (e) => e.hasCountdown && e.status !== "canceled" && e.status !== "missed"
  );
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, minWidth: 360 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Put toggles, theme, and module switches here.
        </Typography>
        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Switch
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
          }
          label="Enable Notifications"
        />
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel id="theme-label">Theme</InputLabel>
          <Select
            labelId="theme-label"
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="ocean">Ocean</MenuItem>
            <MenuItem value="forest">Forest</MenuItem>
            <MenuItem value="sunset">Sunset</MenuItem>
            <MenuItem value="sakura">Sakura</MenuItem>
          </Select>
        </FormControl>
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
      </Paper>
    </Box>
  );
}

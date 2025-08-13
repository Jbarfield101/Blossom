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

export default function Settings() {
  const { events, selectedCountdownId, setSelectedCountdownId } = useCalendar();
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

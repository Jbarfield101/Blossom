import { useTheme } from "@mui/material/styles";
import type { CalendarEvent } from "./types";

// Provide status colors that adapt to the current MUI theme.
export function useStatusColors(): Record<CalendarEvent["status"], string> {
  const theme = useTheme();
  return {
    scheduled: theme.palette.primary.main,
    canceled: theme.palette.error.main,
    missed: theme.palette.warning.main,
    completed: theme.palette.success.main,
  };
}


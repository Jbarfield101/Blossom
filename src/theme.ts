import { createTheme, PaletteMode } from '@mui/material/styles';

export const colors = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  background: '#f5f5f5',
  surface: '#ffffff',
  status: {
    scheduled: '#1976d2',
    canceled: '#d32f2f',
    missed: '#ed6c02',
    completed: '#2e7d32',
  },
};

export const spacing = 8;

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: colors.primary },
      secondary: { main: colors.secondary },
      background: { default: colors.background, paper: colors.surface },
    },
    spacing,
  });

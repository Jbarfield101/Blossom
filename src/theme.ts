import { createTheme } from '@mui/material/styles';

export const colors = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  background: '#121212',
  surface: '#1e1e1e',
  status: {
    scheduled: '#1976d2',
    canceled: '#d32f2f',
    missed: '#ed6c02',
    completed: '#2e7d32',
  },
};

export const spacing = 8;

export const dndColors = {
  primary: '#8b0000',
  secondary: '#d4af37',
  background: '#2a1a1f',
  surface: '#3e2723',
};

export const dndTypography = {
  fontFamily: `'Cinzel', serif`,
  h1: { fontFamily: `'Cinzel', serif` },
  h2: { fontFamily: `'Cinzel', serif` },
};

export const createAppTheme = () =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: { main: colors.primary },
      secondary: { main: colors.secondary },
      background: { default: colors.background, paper: colors.surface },
    },
    spacing,
  });

export const createDndTheme = () =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: { main: dndColors.primary },
      secondary: { main: dndColors.secondary },
      background: {
        default: dndColors.background,
        paper: dndColors.surface,
      },
    },
    typography: dndTypography,
    spacing,
  });

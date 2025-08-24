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

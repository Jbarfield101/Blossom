import { Box, Paper, Typography } from "@mui/material";

export default function Settings() {
  return (
    <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, minWidth: 360 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Put toggles, theme, and module switches here.
        </Typography>
      </Paper>
    </Box>
  );
}

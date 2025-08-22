import { Box, Typography } from "@mui/material";
import { useSystemInfo } from "../features/system/useSystemInfo";
import { Theme, useTheme } from "../features/theme/ThemeContext";

const themeColors: Record<Theme, string> = {
  default: "rgba(255,255,255,0.22)",
  ocean: "rgba(0,150,255,0.22)",
  forest: "rgba(0,255,150,0.22)",
  sunset: "rgba(255,150,0,0.22)",
  sakura: "rgba(255,150,200,0.22)",
  studio: "rgba(0,255,255,0.22)",
  galaxy: "rgba(150,200,255,0.22)",
  retro: "rgba(0,255,0,0.22)",
  noir: "rgba(50,50,50,0.22)",
  aurora: "rgba(150,255,210,0.22)",
  rainy: "rgba(0,120,255,0.22)",
  pastel: "rgba(255,182,193,0.22)",
  mono: "rgba(128,128,128,0.22)",
};

export default function SystemInfo() {
  const info = useSystemInfo();
  const { theme } = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "#fff",
        backgroundColor: themeColors[theme],
        textAlign: "center",
        p: 4,
      }}
    >
      <Typography variant="h4" gutterBottom>
        System Info
      </Typography>
      {info ? (
        <>
          <Typography>CPU Usage: {info.cpu_usage.toFixed(1)}%</Typography>
          {info.gpu_usage !== null && (
            <Typography>GPU Usage: {info.gpu_usage.toFixed(1)}%</Typography>
          )}
          <Typography>Memory Usage: {info.mem_usage.toFixed(1)}%</Typography>
        </>
      ) : (
        <Typography>Loading...</Typography>
      )}
    </Box>
  );
}

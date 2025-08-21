import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
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
};

export default function SystemInfoWidget() {
  const info = useSystemInfo();
  const { theme } = useTheme();
  const nav = useNavigate();

  return (
    <Box
      onClick={() => nav("/system")}
      sx={{
        backgroundColor: themeColors[theme],
        color: "#fff",
        px: 2,
        py: 1,
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        cursor: "pointer",
        minWidth: "8rem",
      }}
    >
      {info ? (
        <>
          <div>CPU: {Math.round(info.cpu_usage)}%</div>
          {info.gpu_usage !== null && <div>GPU: {Math.round(info.gpu_usage)}%</div>}
          <div>Mem: {Math.round(info.mem_usage)}%</div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </Box>
  );
}

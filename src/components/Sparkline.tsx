import { Box } from "@mui/material";

export default function Sparkline({ data, color = "#4caf50", width = 100, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const len = data.length - 1;
  const points = data
    .map((v, i) => {
      const x = (i / len) * width;
      const y = height - ((v - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Box component="svg" width={width} height={height}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </Box>
  );
}

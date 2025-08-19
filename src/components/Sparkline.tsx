import { Box } from "@mui/material";
import { useMemo } from "react";

export default function Sparkline({ data, color = "#4caf50", width = 100, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const ds = useMemo(() => {
    if (!data || data.length === 0) return [] as number[];
    const bucket = Math.max(1, Math.floor(data.length / width));
    const out: number[] = [];
    for (let i = 0; i < data.length; i += bucket) {
      const slice = data.slice(i, i + bucket);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      out.push(avg);
    }
    return out;
  }, [data, width]);

  if (!ds.length) return null;
  const max = Math.max(...ds);
  const min = Math.min(...ds);
  const len = ds.length - 1;
  const points = ds
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

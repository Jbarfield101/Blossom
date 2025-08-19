import { Box } from "@mui/material";
import { memo, useMemo } from "react";
import { bucketDownsample } from "../utils/downsample";

function Sparkline({
  data,
  color = "#4caf50",
  width = 100,
  height = 30,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const ds = useMemo(() => bucketDownsample(data, width), [data, width]);

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

export default memo(Sparkline);

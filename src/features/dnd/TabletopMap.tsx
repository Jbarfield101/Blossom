import { Box, Button, FormControlLabel, Slider, Switch } from "@mui/material";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useTabletopMap } from "../../store/tabletopMap";

export default function TabletopMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const showGrid = useTabletopMap((s) => s.showGrid);
  const gridSize = useTabletopMap((s) => s.gridSize);
  const toggleGrid = useTabletopMap((s) => s.toggleGrid);
  const setGridSize = useTabletopMap((s) => s.setGridSize);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (!showGrid) return;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [showGrid, gridSize]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <FormControlLabel
          control={<Switch checked={showGrid} onChange={toggleGrid} />}
          label="Show Grid"
        />
        <Slider
          value={gridSize}
          onChange={(_, v) => setGridSize(v as number)}
          min={20}
          max={100}
          valueLabelDisplay="auto"
          sx={{ width: 200 }}
        />
        <Button variant="contained" component="label">
          Upload Map
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </Button>
      </Box>
      <Box sx={{ position: "relative", width: 600, height: 600 }}>
        {image && (
          <Box
            component="img"
            src={image}
            alt="tabletop"
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </Box>
    </Box>
  );
}

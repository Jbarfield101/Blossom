import { Box, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { useState } from "react";
import { useTabletopStore } from "../../store/tabletop";

export default function TabletopMap() {
  const {
    gridSize,
    gridColor,
    showGrid,
    setGridSize,
    setGridColor,
    setShowGrid,
  } = useTabletopStore();
  const [image, setImage] = useState<string | undefined>();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button variant="contained" component="label" sx={{ maxWidth: 200 }}>
        Upload Image
        <input type="file" hidden accept="image/*" onChange={handleUpload} />
      </Button>
      <FormControlLabel
        control={
          <Checkbox
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
        }
        label="Show Grid"
      />
      <TextField
        label="Grid Size"
        type="number"
        value={gridSize}
        onChange={(e) => setGridSize(Number(e.target.value))}
        sx={{ maxWidth: 200 }}
      />
      <TextField
        label="Grid Color"
        type="color"
        value={gridColor}
        onChange={(e) => setGridColor(e.target.value)}
        sx={{ maxWidth: 200 }}
        InputLabelProps={{ shrink: true }}
      />
      <Box
        sx={{
          position: "relative",
          mt: 2,
          border: "1px solid #ccc",
          height: 500,
          width: "100%",
          backgroundImage: image ? `url(${image})` : "none",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {showGrid && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
              backgroundSize: `${gridSize}px ${gridSize}px`,
              pointerEvents: "none",
            }}
          />
        )}
      </Box>
    </Box>
  );
}

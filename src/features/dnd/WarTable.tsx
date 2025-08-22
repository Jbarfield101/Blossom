import { Box, Button } from "@mui/material";
import { useState } from "react";
import { useWarTableStore } from "../../store/warTable";

export default function WarTable() {
  const {
    mapImage,
    partyPosition,
    markers,
    setMapImage,
    setPartyPosition,
    addMarker,
  } = useWarTableStore();
  const [mode, setMode] = useState<"party" | "area" | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMapImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (mode === "party") {
      setPartyPosition({ x, y });
    } else if (mode === "area") {
      const note = window.prompt("Area note?");
      if (note) addMarker({ x, y, note });
    }
    setMode(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button variant="contained" component="label" sx={{ maxWidth: 200 }}>
        Upload Map
        <input type="file" hidden accept="image/*" onChange={handleUpload} />
      </Button>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="outlined" onClick={() => setMode("party")}>
          Set Party Position
        </Button>
        <Button variant="outlined" onClick={() => setMode("area")}>
          Add Area
        </Button>
      </Box>
      <Box
        sx={{
          position: "relative",
          mt: 2,
          border: "1px solid #ccc",
          height: 500,
          width: "100%",
          backgroundImage: mapImage ? `url(${mapImage})` : "none",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          overflow: "hidden",
        }}
        onClick={handleMapClick}
      >
        {mapImage && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(245, 222, 179, 0.4)",
              mixBlendMode: "multiply",
              pointerEvents: "none",
            }}
          />
        )}
        {partyPosition && (
          <Box
            sx={{
              position: "absolute",
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "red",
              top: `${partyPosition.y * 100}%`,
              left: `${partyPosition.x * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
        {markers.map((m) => (
          <Box
            key={m.id}
            onClick={(ev) => {
              ev.stopPropagation();
              window.alert(m.note);
            }}
            sx={{
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "blue",
              top: `${m.y * 100}%`,
              left: `${m.x * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
            }}
            title={m.note}
          />
        ))}
      </Box>
    </Box>
  );
}

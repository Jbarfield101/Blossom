import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
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
  const [newMarker, setNewMarker] = useState<{ x: number; y: number } | null>(
    null
  );
  const [noteInput, setNoteInput] = useState("");
  const [viewNote, setViewNote] = useState<string | null>(null);

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
      setMode(null);
    } else if (mode === "area") {
      setNewMarker({ x, y });
      setNoteInput("");
      setMode(null);
    }
  };

  const handleSaveMarker = () => {
    if (newMarker && noteInput.trim()) {
      addMarker({ x: newMarker.x, y: newMarker.y, note: noteInput });
    }
    setNewMarker(null);
    setNoteInput("");
  };

  const handleCancelMarker = () => {
    setNewMarker(null);
    setNoteInput("");
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
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          overflow: "hidden",
        }}
        onClick={handleMapClick}
        data-testid="map"
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
              setViewNote(m.note);
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
      <Dialog open={!!newMarker} onClose={handleCancelMarker}>
        <DialogTitle>Add Area Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Area Note"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelMarker}>Cancel</Button>
          <Button onClick={handleSaveMarker}>Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={viewNote !== null} onClose={() => setViewNote(null)}>
        <DialogTitle>Area Note</DialogTitle>
        <DialogContent>
          <Box>{viewNote}</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewNote(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

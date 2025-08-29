import { useState } from "react";
import { Box, Typography } from "@mui/material";
import VoiceSelect from "../features/voice/VoiceSelect";

export default function Voices() {
  const [selected, setSelected] = useState<string>("");
  return (
    <Box
      sx={{
        p: 2,
        mt: 8,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <VoiceSelect selected={selected} onSelect={setSelected} />
      {selected && (
        <Typography variant="body2">Selected: {selected}</Typography>
      )}
    </Box>
  );
}

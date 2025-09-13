import { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import VoiceSelect from "../features/voice/VoiceSelect";
import { useHiggsVoice } from "../features/voice/useHiggsVoice";
import BackButton from "../components/BackButton";

export default function Voices() {
  const [selected, setSelected] = useState<string>("");
  const [text, setText] = useState<string>("");
  const { speak, status, error } = useHiggsVoice();

  return (
    <>
      <BackButton />
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
      <TextField
        label="Text to speak"
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        fullWidth
      />
      <Button
        variant="contained"
        disabled={!text || !selected || status === "loading" || status === "playing"}
        onClick={() => speak(text, selected)}
      >
        Speak
      </Button>
      {selected && (
        <Typography variant="body2">Selected: {selected}</Typography>
      )}
      {status !== "idle" && (
        <Typography variant="body2">Status: {status}</Typography>
      )}
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
    </Box>
    </>
  );
}

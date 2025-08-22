import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { validateMusicPrompt } from "../utils/musicPromptValidator";

interface Props {
  onGenerate: (prompt: string) => void;
}

export default function MusicPromptGenerator({ onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [tracks, setTracks] = useState(1);

  const handleCheck = () => {
    const res = validateMusicPrompt(text);
    setResult(res.message);
    setCanGenerate(res.canGenerate);
  };

  const handleSend = () => {
    if (canGenerate) {
      const prompt = `${text} template="Classic Lofi" tracks=${tracks}`;
      onGenerate(prompt);
      setOpen(false);
      setText("");
      setResult(null);
      setCanGenerate(false);
      setTracks(1);
    }
  };

  return (
    <Box>
      <Button variant="outlined" onClick={() => setOpen((o) => !o)}>
        Music Prompt
      </Button>
      {open && (
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            multiline
            placeholder="Describe vibe or instruments"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button onClick={handleCheck}>Check</Button>
            {canGenerate && (
              <>
                <TextField
                  type="number"
                  value={tracks}
                  onChange={(e) => setTracks(Number(e.target.value))}
                  inputProps={{ min: 1, "aria-label": "track count" }}
                  sx={{ width: 80 }}
                />
                <Button onClick={handleSend}>Generate</Button>
              </>
            )}
          </Stack>
          {result && (
            <Typography sx={{ mt: 1, whiteSpace: "pre-wrap" }}>{result}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

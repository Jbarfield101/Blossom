import { useState } from "react";
import { Box, Stack, TextField, Button, Typography } from "@mui/material";
import { generatePrompt } from "../utils/promptGenerator";
import { getRandomWord } from "../utils/randomWord";

export default function Fusion() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [prompt, setPrompt] = useState("");
  const [archive, setArchive] = useState<
    { word1: string; word2: string; prompt: string }[]
  >(() => {
    const stored = localStorage.getItem("fusionArchive");
    return stored ? JSON.parse(stored) : [];
  });

  const handleChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\s+/g, "");
      setter(value);
    };

  const saveArchive = (entry: {
    word1: string;
    word2: string;
    prompt: string;
  }) => {
    setArchive((prev) => {
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem("fusionArchive", JSON.stringify(next));
      return next;
    });
  };

  const fuse = (w1 = word1, w2 = word2) => {
    if (!w1 && !w2) return;
    const fusion = [w1, w2].filter(Boolean).join(" ");
    const result = generatePrompt(fusion, "image");
    setPrompt(result);
    saveArchive({ word1: w1, word2: w2, prompt: result });
  };

  const randomize = (setter: (v: string) => void) => {
    setter(getRandomWord());
  };

  const randomFuse = () => {
    const w1 = getRandomWord();
    const w2 = getRandomWord();
    setWord1(w1);
    setWord2(w2);
    fuse(w1, w2);
  };

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Word 1"
              value={word1}
              onChange={handleChange(setWord1)}
            />
            <Button variant="outlined" onClick={() => randomize(setWord1)}>
              Random
            </Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Word 2"
              value={word2}
              onChange={handleChange(setWord2)}
            />
            <Button variant="outlined" onClick={() => randomize(setWord2)}>
              Random
            </Button>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="contained" onClick={() => fuse()}>
            Fuse
          </Button>
          <Button variant="contained" onClick={randomFuse}>
            Random
          </Button>
        </Stack>
        <TextField
          label="Image Prompt"
          multiline
          minRows={6}
          value={prompt}
          InputProps={{ readOnly: true }}
        />
        {archive.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prompt Archive
            </Typography>
            <Stack spacing={1} maxHeight={200} sx={{ overflowY: "auto" }}>
              {archive.map((a, i) => (
                <Box key={i}>{`${a.word1} + ${a.word2}: ${a.prompt}`}</Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

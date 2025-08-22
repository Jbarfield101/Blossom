import { useState } from "react";
import { Box, Stack, TextField, Button, Typography } from "@mui/material";
import { generatePrompt } from "../utils/promptGenerator";
import { getRandomConcept } from "../utils/randomConcept";

export default function Fusion() {
  const [concept1, setConcept1] = useState("");
  const [concept2, setConcept2] = useState("");
  const [prompt, setPrompt] = useState("");
  const [archive, setArchive] = useState<
    { concept1: string; concept2: string; prompt: string }[]
  >(() => {
    const stored = localStorage.getItem("fusionArchive");
    return stored ? JSON.parse(stored) : [];
  });

  const handleChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  const saveArchive = (entry: {
    concept1: string;
    concept2: string;
    prompt: string;
  }) => {
    setArchive((prev) => {
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem("fusionArchive", JSON.stringify(next));
      return next;
    });
  };

  const fuse = (c1 = concept1, c2 = concept2) => {
    if (!c1 && !c2) return;
    const fusion = [c1, c2].filter(Boolean).join(" and ");
    const result = generatePrompt(fusion, "image");
    setPrompt(result);
    saveArchive({ concept1: c1, concept2: c2, prompt: result });
  };

  const randomize = (setter: (v: string) => void) => {
    setter(getRandomConcept());
  };

  const randomFuse = () => {
    const c1 = getRandomConcept();
    const c2 = getRandomConcept();
    setConcept1(c1);
    setConcept2(c2);
    fuse(c1, c2);
  };

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Concept 1"
              value={concept1}
              onChange={handleChange(setConcept1)}
            />
            <Button variant="outlined" onClick={() => randomize(setConcept1)}>
              Random
            </Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Concept 2"
              value={concept2}
              onChange={handleChange(setConcept2)}
            />
            <Button variant="outlined" onClick={() => randomize(setConcept2)}>
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
                <Box key={i}>{`${a.concept1} + ${a.concept2}: ${a.prompt}`}</Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

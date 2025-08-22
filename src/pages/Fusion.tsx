import { useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { generatePrompt } from "../utils/promptGenerator";

export default function Fusion() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\s+/g, "");
      setter(value);
    };

  const fusion = [word1, word2].filter(Boolean).join(" ");
  const basePrompt = generatePrompt(fusion, "image");

  const generate = async () => {
    if (!basePrompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const reply: string = await invoke("general_chat", {
        messages: [{ role: "user", content: basePrompt }],
      });
      setPrompt(reply);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Word 1"
            value={word1}
            onChange={handleChange(setWord1)}
          />
          <TextField
            label="Word 2"
            value={word2}
            onChange={handleChange(setWord2)}
          />
        </Stack>
        <TextField
          label="Image Prompt"
          multiline
          minRows={6}
          value={prompt || basePrompt}
          InputProps={{ readOnly: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          onClick={generate}
          disabled={loading || !basePrompt}
        >
          {loading ? <CircularProgress size={24} /> : "Send to Chat"}
        </Button>
      </Stack>
    </Box>
  );
}

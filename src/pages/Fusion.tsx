import { useState } from "react";
import { Box, Stack, TextField } from "@mui/material";

export default function Fusion() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");

  const handleChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\s+/g, "");
      setter(value);
    };

  const fusion = [word1, word2].filter(Boolean).join(" ");

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
          label="Fusion"
          multiline
          minRows={6}
          value={fusion}
          InputProps={{ readOnly: true }}
        />
      </Stack>
    </Box>
  );
}

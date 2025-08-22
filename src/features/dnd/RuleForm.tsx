import { useState } from "react";
import { Typography, TextField, Button } from "@mui/material";
import { zRule } from "./schemas";
import type { RuleData } from "./types";

export default function RuleForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<RuleData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: RuleData = {
      id: crypto.randomUUID(),
      name,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const parsed = zRule.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6">Rulebook</Typography>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        margin="normal"
      />
      <TextField
        label="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Submit
      </Button>
      {result && <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  );
}

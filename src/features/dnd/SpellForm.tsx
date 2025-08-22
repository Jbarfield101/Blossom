import { useState } from "react";
import { Typography, TextField, Button } from "@mui/material";
import SpellPdfUpload from "./SpellPdfUpload";
import { zSpell } from "./schemas";
import type { SpellData } from "./types";

export default function SpellForm() {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [school, setSchool] = useState("");
  const [castingTime, setCastingTime] = useState("");
  const [range, setRange] = useState("");
  const [components, setComponents] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<SpellData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: SpellData = {
      id: crypto.randomUUID(),
      name,
      level: Number(level),
      school,
      castingTime,
      range,
      components: components.split(",").map((c) => c.trim()).filter(Boolean),
      duration,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const parsed = zSpell.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6">Spellbook</Typography>
      <SpellPdfUpload />
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Level"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="School"
        value={school}
        onChange={(e) => setSchool(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Casting Time"
        value={castingTime}
        onChange={(e) => setCastingTime(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Range"
        value={range}
        onChange={(e) => setRange(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Components (comma separated)"
        value={components}
        onChange={(e) => setComponents(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Duration"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
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

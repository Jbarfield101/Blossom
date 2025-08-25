import { useState } from "react";
import { Typography, TextField, Button, Grid, Box } from "@mui/material";
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
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Spellbook</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <SpellPdfUpload />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="School"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Casting Time"
            value={castingTime}
            onChange={(e) => setCastingTime(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Components (comma separated)"
            value={components}
            onChange={(e) => setComponents(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Submit
          </Button>
        </Grid>
        {result && (
          <Grid item xs={12}>
            <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

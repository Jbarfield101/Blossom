import { useState } from "react";
import { Typography, Button, Grid, Box } from "@mui/material";
import StyledTextField from "./StyledTextField";
import SpellPdfUpload from "./SpellPdfUpload";
import { zSpell } from "./schemas";
import type { SpellData } from "./types";
import SpellBook from "./SpellBook";
import { useSpells } from "../../store/spells";

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
  const addSpell = useSpells((s) => s.addSpell);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: SpellData = {
      id: crypto.randomUUID(),
      name,
      level: Number(level),
      school,
      castingTime,
      range,
      components: components
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      duration,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const parsed = zSpell.parse(data);
    await addSpell(parsed);
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
          <StyledTextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="School"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Casting Time"
            value={castingTime}
            onChange={(e) => setCastingTime(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Components (comma separated)"
            value={components}
            onChange={(e) => setComponents(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
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
        <Grid item xs={12}>
          <SpellBook />
        </Grid>
      </Grid>
    </Box>
  );
}

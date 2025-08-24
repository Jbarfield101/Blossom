import { useState } from "react";
import { Typography, TextField, Button, MenuItem, Grid } from "@mui/material";
import { zLore } from "./schemas";
import { LoreData } from "./types";
import { useWorlds } from "../../store/worlds";
import LorePdfUpload from "./LorePdfUpload";

export default function LoreForm() {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [hooks, setHooks] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<LoreData | null>(null);
  const worlds = useWorlds((s) => s.worlds);
  const [world, setWorld] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: LoreData = {
      id: crypto.randomUUID(),
      name,
      summary,
      location: location || undefined,
      hooks: hooks
        ? hooks.split(",").map((h) => h.trim()).filter(Boolean)
        : undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const parsed = zLore.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Lore Form</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="World"
            value={world}
            onChange={(e) => setWorld(e.target.value)}
            fullWidth
            margin="normal"
          >
            {worlds.map((w) => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {world && (
          <Grid item xs={12} md={6}>
            <LorePdfUpload world={world} />
          </Grid>
        )}
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
            label="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Hooks (comma separated)"
            value={hooks}
            onChange={(e) => setHooks(e.target.value)}
            fullWidth
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
    </form>
  );
}

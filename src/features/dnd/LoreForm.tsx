import { useState } from "react";
import { Typography, TextField, Button, MenuItem } from "@mui/material";
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
      <Typography variant="h6">Lore Form</Typography>
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
      {world && <LorePdfUpload world={world} />}
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Hooks (comma separated)"
        value={hooks}
        onChange={(e) => setHooks(e.target.value)}
        fullWidth
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

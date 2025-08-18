import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { zNpc } from "./schemas";
import { NpcData, DndTheme } from "./types";

const themes: DndTheme[] = ["Parchment", "Ink", "Minimal"];

export default function NpcForm() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [motivation, setMotivation] = useState("");
  const [secret, setSecret] = useState("");
  const [hooks, setHooks] = useState("");
  const [statBlockRef, setStatBlockRef] = useState("");
  const [statOverrides, setStatOverrides] = useState("");
  const [theme, setTheme] = useState<DndTheme>("Parchment");
  const [result, setResult] = useState<NpcData | null>(null);

  const themeStyles: Record<DndTheme, React.CSSProperties> = {
    Parchment: {
      background: "#fdf5e6",
      padding: "1rem",
      fontFamily: "serif",
    },
    Ink: {
      background: "#fff",
      color: "#000",
      padding: "1rem",
      fontFamily: "monospace",
    },
    Minimal: {
      background: "#f0f0f0",
      padding: "1rem",
      fontFamily: "sans-serif",
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: NpcData = {
      id: crypto.randomUUID(),
      name,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      appearance,
      personality,
      motivation,
      secret,
      hooks: hooks.split(",").map((h) => h.trim()).filter(Boolean),
      stat_block_ref: statBlockRef,
      stat_overrides: statOverrides,
      theme,
    };
    const parsed = zNpc.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6">NPC Form</Typography>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
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
      <TextField
        label="Appearance"
        value={appearance}
        onChange={(e) => setAppearance(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Personality"
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Motivation"
        value={motivation}
        onChange={(e) => setMotivation(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
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
        label="Stat Block Ref"
        value={statBlockRef}
        onChange={(e) => setStatBlockRef(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Stat Overrides"
        value={statOverrides}
        onChange={(e) => setStatOverrides(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        select
        label="Theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as DndTheme)}
        fullWidth
        margin="normal"
      >
        {themes.map((t) => (
          <MenuItem key={t} value={t}>
            {t}
          </MenuItem>
        ))}
      </TextField>
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Submit
      </Button>
      <div style={{ ...themeStyles[theme], marginTop: "1rem" }}>
        <h3>{name || "NPC Preview"}</h3>
        {appearance && (
          <p>
            <strong>Appearance:</strong> {appearance}
          </p>
        )}
        {personality && (
          <p>
            <strong>Personality:</strong> {personality}
          </p>
        )}
        {motivation && (
          <p>
            <strong>Motivation:</strong> {motivation}
          </p>
        )}
        {secret && (
          <p>
            <strong>Secret:</strong> {secret}
          </p>
        )}
        {hooks && (
          <p>
            <strong>Hooks:</strong> {hooks}
          </p>
        )}
      </div>
      {result && (
        <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </form>
  );
}

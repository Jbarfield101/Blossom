import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { zQuest } from "./schemas";
import { QuestData, DndTheme } from "./types";

const themes: DndTheme[] = ["Parchment", "Ink", "Minimal"];

export default function QuestForm() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState("");
  const [summary, setSummary] = useState("");
  const [beats, setBeats] = useState("");
  const [gp, setGp] = useState("");
  const [items, setItems] = useState("");
  const [favors, setFavors] = useState("");
  const [complications, setComplications] = useState("");
  const [theme, setTheme] = useState<DndTheme>("Parchment");
  const [result, setResult] = useState<QuestData | null>(null);

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
    const data: QuestData = {
      id: crypto.randomUUID(),
      name,
      tier,
      summary,
      beats: beats.split(",").map((b) => b.trim()).filter(Boolean),
      rewards: {
        gp: gp || undefined,
        items: items || undefined,
        favors: favors || undefined,
      },
      complications: complications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      theme,
    };
    const parsed = zQuest.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6">Quest Form</Typography>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Tier"
        value={tier}
        onChange={(e) => setTier(e.target.value)}
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
        label="Beats (comma separated)"
        value={beats}
        onChange={(e) => setBeats(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Reward GP"
        value={gp}
        onChange={(e) => setGp(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Reward Items"
        value={items}
        onChange={(e) => setItems(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Reward Favors"
        value={favors}
        onChange={(e) => setFavors(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Complications (comma separated)"
        value={complications}
        onChange={(e) => setComplications(e.target.value)}
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
        <h3>{name || "Quest Preview"}</h3>
        {summary && (
          <p>
            <strong>Summary:</strong> {summary}
          </p>
        )}
        {beats && (
          <p>
            <strong>Beats:</strong> {beats}
          </p>
        )}
        {(gp || items || favors) && (
          <p>
            <strong>Rewards:</strong> {gp && `GP: ${gp} `}
            {items && `Items: ${items} `}
            {favors && `Favors: ${favors}`}
          </p>
        )}
        {complications && (
          <p>
            <strong>Complications:</strong> {complications}
          </p>
        )}
      </div>
      {result && (
        <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </form>
  );
}

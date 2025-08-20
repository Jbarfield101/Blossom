import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { zQuest } from "./schemas";
import { QuestData, DndTheme } from "./types";
import { themes, themeStyles } from "./theme";

export default function QuestForm() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<number | undefined>();
  const [summary, setSummary] = useState("");
  const [beats, setBeats] = useState("");
  const [gp, setGp] = useState<number | undefined>();
  const [items, setItems] = useState("");
  const [favors, setFavors] = useState("");
  const [complications, setComplications] = useState("");
  const [theme, setTheme] = useState<DndTheme>("Parchment");
  const [result, setResult] = useState<QuestData | null>(null);
  const [errors, setErrors] = useState<{ tier?: string; gp?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: QuestData = {
      id: crypto.randomUUID(),
      name,
      tier: tier ?? NaN,
      summary,
      beats: beats.split(",").map((b) => b.trim()).filter(Boolean),
      rewards: {
        gp,
        items: items || undefined,
        favors: favors || undefined,
      },
      complications: complications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      theme,
    };
    const parsed = zQuest.safeParse(data);
    if (!parsed.success) {
      const formatted = parsed.error.format();
      setErrors({
        tier: formatted.tier?._errors[0],
        gp: formatted.rewards?.gp?._errors[0],
      });
      setResult(null);
      return;
    }
    setErrors({});
    setResult(parsed.data);
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
        type="number"
        value={tier ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          setTier(val === "" ? undefined : Number(val));
          setErrors((prev) => ({ ...prev, tier: undefined }));
        }}
        error={!!errors.tier}
        helperText={errors.tier}
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
        type="number"
        value={gp ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          setGp(val === "" ? undefined : Number(val));
          setErrors((prev) => ({ ...prev, gp: undefined }));
        }}
        error={!!errors.gp}
        helperText={errors.gp}
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

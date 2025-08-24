import { useState } from "react";
import { Typography, TextField, Button, Grid, Box } from "@mui/material";
import FormErrorText from "./FormErrorText";
import { zQuest } from "./schemas";
import { QuestData } from "./types";
import { themeStyles, useDndTheme } from "./theme";

export default function QuestForm() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<number | undefined>();
  const [summary, setSummary] = useState("");
  const [beats, setBeats] = useState("");
  const [gp, setGp] = useState<number | undefined>();
  const [items, setItems] = useState("");
  const [favors, setFavors] = useState("");
  const [complications, setComplications] = useState("");
  const [result, setResult] = useState<QuestData | null>(null);
  const [errors, setErrors] = useState<{ tier?: string; gp?: string }>({});
  const theme = useDndTheme();

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
    <Box component="form" onSubmit={handleSubmit} sx={themeStyles[theme]}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Quest Form</Typography>
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
            label="Tier"
            type="number"
            value={tier ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setTier(val === "" ? undefined : Number(val));
              setErrors((prev) => ({ ...prev, tier: undefined }));
            }}
            error={!!errors.tier}
            helperText={
              <FormErrorText id="tier-error">{errors.tier}</FormErrorText>
            }
            aria-describedby={errors.tier ? "tier-error" : undefined}
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
            label="Beats (comma separated)"
            value={beats}
            onChange={(e) => setBeats(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
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
            helperText={
              <FormErrorText id="gp-error">{errors.gp}</FormErrorText>
            }
            aria-describedby={errors.gp ? "gp-error" : undefined}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Reward Items"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Reward Favors"
            value={favors}
            onChange={(e) => setFavors(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Complications (comma separated)"
            value={complications}
            onChange={(e) => setComplications(e.target.value)}
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

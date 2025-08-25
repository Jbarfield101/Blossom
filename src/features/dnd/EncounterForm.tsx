import { useState } from "react";
import { Typography, TextField, Button, Grid, Box } from "@mui/material";
import FormErrorText from "./FormErrorText";
import { zEncounter } from "./schemas";
import { EncounterData } from "./types";
// Removed custom D&D theming

export default function EncounterForm() {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<number | undefined>();
  const [creatures, setCreatures] = useState("");
  const [tactics, setTactics] = useState("");
  const [terrain, setTerrain] = useState("");
  const [treasure, setTreasure] = useState("");
  const [scaling, setScaling] = useState("");
  const [result, setResult] = useState<EncounterData | null>(null);
  const [errors, setErrors] = useState<{ level?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: EncounterData = {
      id: crypto.randomUUID(),
      name,
      level: level ?? NaN,
      creatures: creatures.split(",").map((c) => c.trim()).filter(Boolean),
      tactics,
      terrain,
      treasure,
      scaling,
    };
    const parsed = zEncounter.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ level: fieldErrors.level?.[0] });
      setResult(null);
      return;
    }
    setErrors({});
    setResult(parsed.data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Encounter Form</Typography>
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
            type="number"
            value={level ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setLevel(val === "" ? undefined : Number(val));
              setErrors((prev) => ({ ...prev, level: undefined }));
            }}
            error={!!errors.level}
            helperText={
              <FormErrorText id="level-error">{errors.level}</FormErrorText>
            }
            aria-describedby={errors.level ? "level-error" : undefined}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Creatures (comma separated)"
            value={creatures}
            onChange={(e) => setCreatures(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Tactics"
            value={tactics}
            onChange={(e) => setTactics(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Terrain"
            value={terrain}
            onChange={(e) => setTerrain(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Treasure"
            value={treasure}
            onChange={(e) => setTreasure(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Scaling"
            value={scaling}
            onChange={(e) => setScaling(e.target.value)}
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
          <div style={{ marginTop: "1rem" }}>
            <h3>{name || "Encounter Preview"}</h3>
            {level && (
              <p>
                <strong>Level:</strong> {level}
              </p>
            )}
            {creatures && (
              <p>
                <strong>Creatures:</strong> {creatures}
              </p>
            )}
            {tactics && (
              <p>
                <strong>Tactics:</strong> {tactics}
              </p>
            )}
            {terrain && (
              <p>
                <strong>Terrain:</strong> {terrain}
              </p>
            )}
            {treasure && (
              <p>
                <strong>Treasure:</strong> {treasure}
              </p>
            )}
            {scaling && (
              <p>
                <strong>Scaling:</strong> {scaling}
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

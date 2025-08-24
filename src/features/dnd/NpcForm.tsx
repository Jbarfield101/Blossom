import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Grid,
} from "@mui/material";
import { z } from "zod";
import { zNpc } from "../../dnd/schemas/npc";
import { NpcData } from "./types";
import { useWorlds } from "../../store/worlds";
import NpcPdfUpload from "./NpcPdfUpload";

export default function NpcForm() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [role, setRole] = useState("");
  const [alignment, setAlignment] = useState("");
  const [playerCharacter, setPlayerCharacter] = useState(false);
  const [backstory, setBackstory] = useState("");
  const [location, setLocation] = useState("");
  const [hooks, setHooks] = useState("");
  const [quirks, setQuirks] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("");
  const [voiceProvider, setVoiceProvider] = useState("");
  const [voicePreset, setVoicePreset] = useState("");
  const [portrait, setPortrait] = useState("");
  const [icon, setIcon] = useState("");
  const [statblock, setStatblock] = useState("{}");
  const [sections, setSections] = useState("{}");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<NpcData | null>(null);
  const worlds = useWorlds((s) => s.worlds);
  const [world, setWorld] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let parsedStatblock: Record<string, unknown> = {};
    try {
      parsedStatblock = JSON.parse(statblock || "{}");
    } catch {
      setErrors({ statblock: "Invalid JSON" });
      setResult(null);
      return;
    }

    let parsedSections: Record<string, unknown> = {};
    try {
      parsedSections = JSON.parse(sections || "{}");
    } catch {
      setErrors({ sections: "Invalid JSON" });
      setResult(null);
      return;
    }

    const data: NpcData = {
      id: crypto.randomUUID(),
      name,
      species,
      role,
      alignment,
      playerCharacter,
      backstory: backstory || undefined,
      location: location || undefined,
      hooks: hooks.split(",").map((h) => h.trim()).filter(Boolean),
      quirks: quirks ? quirks.split(",").map((q) => q.trim()).filter(Boolean) : undefined,
      voice: {
        style: voiceStyle,
        provider: voiceProvider,
        preset: voicePreset,
      },
      portrait: portrait || "placeholder.png",
      icon: icon || "placeholder-icon.png",
      sections: Object.keys(parsedSections).length ? parsedSections : undefined,
      statblock: parsedStatblock,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      const parsed = zNpc.parse(data);
      setResult(parsed);
    } catch (err) {
      setResult(null);
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string | null> = {};
        err.issues.forEach((issue) => {
          fieldErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(fieldErrors);
      }
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">NPC Form</Typography>
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
            <NpcPdfUpload world={world} />
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Species"
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value);
              setErrors((prev) => ({ ...prev, species: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.species)}
            helperText={errors.species}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setErrors((prev) => ({ ...prev, role: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.role)}
            helperText={errors.role}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Alignment"
            value={alignment}
            onChange={(e) => {
              setAlignment(e.target.value);
              setErrors((prev) => ({ ...prev, alignment: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.alignment)}
            helperText={errors.alignment}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={playerCharacter}
                onChange={(e) => setPlayerCharacter(e.target.checked)}
              />
            }
            label="Player Character"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Backstory"
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
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
            onChange={(e) => {
              setHooks(e.target.value);
              setErrors((prev) => ({ ...prev, hooks: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.hooks)}
            helperText={errors.hooks}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Quirks (comma separated)"
            value={quirks}
            onChange={(e) => setQuirks(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Voice Style"
            value={voiceStyle}
            onChange={(e) => {
              setVoiceStyle(e.target.value);
              setErrors((prev) => ({ ...prev, ["voice.style"]: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors["voice.style"])}
            helperText={errors["voice.style"]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Voice Provider"
            value={voiceProvider}
            onChange={(e) => {
              setVoiceProvider(e.target.value);
              setErrors((prev) => ({ ...prev, ["voice.provider"]: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors["voice.provider"])}
            helperText={errors["voice.provider"]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Voice Preset"
            value={voicePreset}
            onChange={(e) => {
              setVoicePreset(e.target.value);
              setErrors((prev) => ({ ...prev, ["voice.preset"]: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors["voice.preset"])}
            helperText={errors["voice.preset"]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Portrait URL"
            value={portrait}
            onChange={(e) => setPortrait(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Icon URL"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Statblock JSON"
            value={statblock}
            onChange={(e) => {
              setStatblock(e.target.value);
              setErrors((prev) => ({ ...prev, statblock: null }));
            }}
            fullWidth
            margin="normal"
            multiline
            error={Boolean(errors.statblock)}
            helperText={errors.statblock}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Custom Sections JSON"
            value={sections}
            onChange={(e) => {
              setSections(e.target.value);
              setErrors((prev) => ({ ...prev, sections: null }));
            }}
            fullWidth
            margin="normal"
            multiline
            error={Boolean(errors.sections)}
            helperText={errors.sections}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              setErrors((prev) => ({ ...prev, tags: null }));
            }}
            fullWidth
            margin="normal"
            error={Boolean(errors.tags)}
            helperText={errors.tags}
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

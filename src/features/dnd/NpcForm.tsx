import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
  Box,
} from "@mui/material";
import FormErrorText from "./FormErrorText";
import { z } from "zod";
import { zNpc } from "../../dnd/schemas/npc";
import { NpcData } from "./types";
import NpcPdfUpload from "./NpcPdfUpload";
import { useDndTheme, themeStyles } from "./theme";

interface Props {
  world: string;
}

export default function NpcForm({ world }: Props) {
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
  const theme = useDndTheme();

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
    <Box component="form" onSubmit={handleSubmit} sx={themeStyles[theme]}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">NPC Form</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <NpcPdfUpload world={world} />
        </Grid>
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
            helperText={
              <FormErrorText id="name-error">{errors.name}</FormErrorText>
            }
            aria-describedby={errors.name ? "name-error" : undefined}
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
            helperText={
              <FormErrorText id="species-error">{errors.species}</FormErrorText>
            }
            aria-describedby={errors.species ? "species-error" : undefined}
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
            helperText={
              <FormErrorText id="role-error">{errors.role}</FormErrorText>
            }
            aria-describedby={errors.role ? "role-error" : undefined}
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
            helperText={
              <FormErrorText id="alignment-error">{errors.alignment}</FormErrorText>
            }
            aria-describedby={
              errors.alignment ? "alignment-error" : undefined
            }
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
            helperText={
              <FormErrorText id="hooks-error">{errors.hooks}</FormErrorText>
            }
            aria-describedby={errors.hooks ? "hooks-error" : undefined}
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
            helperText={
              <FormErrorText id="voice-style-error">
                {errors["voice.style"]}
              </FormErrorText>
            }
            aria-describedby={
              errors["voice.style"] ? "voice-style-error" : undefined
            }
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
            helperText={
              <FormErrorText id="voice-provider-error">
                {errors["voice.provider"]}
              </FormErrorText>
            }
            aria-describedby={
              errors["voice.provider"] ? "voice-provider-error" : undefined
            }
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
            helperText={
              <FormErrorText id="voice-preset-error">
                {errors["voice.preset"]}
              </FormErrorText>
            }
            aria-describedby={
              errors["voice.preset"] ? "voice-preset-error" : undefined
            }
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
            helperText={
              <FormErrorText id="statblock-error">
                {errors.statblock}
              </FormErrorText>
            }
            aria-describedby={
              errors.statblock ? "statblock-error" : undefined
            }
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
            helperText={
              <FormErrorText id="sections-error">
                {errors.sections}
              </FormErrorText>
            }
            aria-describedby={
              errors.sections ? "sections-error" : undefined
            }
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
            helperText={
              <FormErrorText id="tags-error">{errors.tags}</FormErrorText>
            }
            aria-describedby={errors.tags ? "tags-error" : undefined}
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

import { useState } from "react";
import { Typography, TextField, Button } from "@mui/material";
import { z } from "zod";
import { zNpc } from "./schemas";
import { NpcData } from "./types";

export default function NpcForm() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [role, setRole] = useState("");
  const [alignment, setAlignment] = useState("");
  const [backstory, setBackstory] = useState("");
  const [location, setLocation] = useState("");
  const [hooks, setHooks] = useState("");
  const [quirks, setQuirks] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("");
  const [voiceProvider, setVoiceProvider] = useState("");
  const [voicePreset, setVoicePreset] = useState("");
  const [portrait, setPortrait] = useState("");
  const [statblock, setStatblock] = useState("{}");
  const [statblockError, setStatblockError] = useState<string | null>(null);
  const [voiceStyleError, setVoiceStyleError] = useState<string | null>(null);
  const [voiceProviderError, setVoiceProviderError] = useState<string | null>(null);
  const [voicePresetError, setVoicePresetError] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<NpcData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedStatblock: Record<string, unknown> = {};
    try {
      parsedStatblock = JSON.parse(statblock || "{}");
      setStatblockError(null);
    } catch {
      setStatblockError("Invalid JSON");
      return;
    }

    const data: NpcData = {
      id: crypto.randomUUID(),
      name,
      species,
      role,
      alignment,
      backstory: backstory || undefined,
      location: location || undefined,
      hooks: hooks.split(",").map((h) => h.trim()).filter(Boolean),
      quirks: quirks ? quirks.split(",").map((q) => q.trim()).filter(Boolean) : undefined,
      voice: {
        style: voiceStyle,
        provider: voiceProvider,
        preset: voicePreset,
      },
      portrait: portrait || undefined,
      statblock: parsedStatblock,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    setVoiceStyleError(null);
    setVoiceProviderError(null);
    setVoicePresetError(null);

    try {
      const parsed = zNpc.parse(data);
      setResult(parsed);
    } catch (err) {
      setResult(null);
      if (err instanceof z.ZodError) {
        err.issues.forEach((issue) => {
          const path = issue.path.join(".");
          if (path === "voice.style") setVoiceStyleError(issue.message);
          if (path === "voice.provider") setVoiceProviderError(issue.message);
          if (path === "voice.preset") setVoicePresetError(issue.message);
        });
      }
    }
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
        label="Species"
        value={species}
        onChange={(e) => setSpecies(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Alignment"
        value={alignment}
        onChange={(e) => setAlignment(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Backstory"
        value={backstory}
        onChange={(e) => setBackstory(e.target.value)}
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
        label="Quirks (comma separated)"
        value={quirks}
        onChange={(e) => setQuirks(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Voice Style"
        value={voiceStyle}
        onChange={(e) => {
          setVoiceStyle(e.target.value);
          setVoiceStyleError(null);
        }}
        fullWidth
        margin="normal"
        error={Boolean(voiceStyleError)}
        helperText={voiceStyleError}
      />
      <TextField
        label="Voice Provider"
        value={voiceProvider}
        onChange={(e) => {
          setVoiceProvider(e.target.value);
          setVoiceProviderError(null);
        }}
        fullWidth
        margin="normal"
        error={Boolean(voiceProviderError)}
        helperText={voiceProviderError}
      />
      <TextField
        label="Voice Preset"
        value={voicePreset}
        onChange={(e) => {
          setVoicePreset(e.target.value);
          setVoicePresetError(null);
        }}
        fullWidth
        margin="normal"
        error={Boolean(voicePresetError)}
        helperText={voicePresetError}
      />
      <TextField
        label="Portrait URL"
        value={portrait}
        onChange={(e) => setPortrait(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Statblock JSON"
        value={statblock}
        onChange={(e) => {
          setStatblock(e.target.value);
          setStatblockError(null);
        }}
        fullWidth
        margin="normal"
        multiline
        error={Boolean(statblockError)}
        helperText={statblockError}
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

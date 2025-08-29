import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useVoices } from "../../store/voices";

export default function VoiceSettings() {
  const allVoices = useVoices((s) => s.voices);
  const voiceFilter = useVoices((s) => s.filter);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const voices = useMemo(
    () =>
      allVoices
        .filter(voiceFilter)
        .filter((v) => !favoriteOnly || v.favorite),
    [allVoices, voiceFilter, favoriteOnly]
  );
  const addVoice = useVoices((s) => s.addVoice);
  const removeVoice = useVoices((s) => s.removeVoice);
  const setTags = useVoices((s) => s.setTags);
  const toggleFavorite = useVoices((s) => s.toggleFavorite);
  const load = useVoices((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  const [id, setId] = useState("");
  const [tagInput, setTagInput] = useState("");

  const handleAdd = () => {
    const trimmedId = id.trim();
    if (!trimmedId) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    addVoice({ id: trimmedId, tags });
    setId("");
    setTagInput("");
  };

  const handleTagChange = (voiceId: string, value: string) => {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setTags(voiceId, tags);
  };

  return (
    <Box id="voice-settings">
      <Typography variant="subtitle1">Bark Voices</Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={favoriteOnly}
            onChange={(e) => setFavoriteOnly(e.target.checked)}
          />
        }
        label="Favorites"
      />
      <Stack spacing={2} sx={{ mt: 2 }}>
        {voices.map((v) => (
          <Stack key={v.id} direction="row" spacing={1} alignItems="center">
            <Typography sx={{ flex: 1 }}>{v.id}</Typography>
            <IconButton onClick={() => toggleFavorite(v.id)} size="small">
              {v.favorite ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
            <TextField
              label="Tags"
              size="small"
              value={v.tags.join(", ")}
              onChange={(e) => handleTagChange(v.id, e.target.value)}
            />
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => removeVoice(v.id)}
            >
              Remove
            </Button>
          </Stack>
        ))}
      </Stack>
      <Typography variant="subtitle1" sx={{ mt: 3 }}>
        Add Voice
      </Typography>
      <Stack spacing={2} sx={{ mt: 1 }} direction="row" flexWrap="wrap">
        <TextField
          label="ID"
          size="small"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <TextField
          label="Tags"
          size="small"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Stack>
    </Box>
  );
}

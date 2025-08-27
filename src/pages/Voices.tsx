import { useEffect, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import { useShallow } from "zustand/react/shallow";
import { useVoices, Voice } from "../store/voices";
import { generateAudio } from "../features/voice/bark";
import * as Tone from "tone";

export default function Voices() {
  const { voices, load, toggleFavorite } = useVoices(
    useShallow((s) => ({
      voices: s.voices,
      load: s.load,
      toggleFavorite: s.toggleFavorite,
    }))
  );

  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Voice | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const filteredVoices = voices.filter((v) => {
    if (favoriteOnly && !v.favorite) return false;
    if (
      tagFilter &&
      !v.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))
    )
      return false;
    return true;
  });

  const handleTest = async () => {
    if (!selected) return;
    await Tone.start();
    const buffer = await generateAudio(text, selected.preset);
    const player = new Tone.Player(buffer).toDestination();
    player.start();
  };

  return (
    <Box
      sx={{
        p: 2,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <TextField
        label="Text to speak"
        value={text}
        onChange={(e) => setText(e.target.value)}
        fullWidth
        sx={{ input: { color: "#fff" }, label: { color: "#fff" } }}
      />
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          label="Filter by tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          sx={{ input: { color: "#fff" }, label: { color: "#fff" } }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={favoriteOnly}
              onChange={(e) => setFavoriteOnly(e.target.checked)}
            />
          }
          label="Favorites"
        />
      </Box>
      <List sx={{ maxHeight: 300, overflow: "auto" }}>
        {filteredVoices.map((v) => (
          <ListItem
            key={v.id}
            disablePadding
            secondaryAction={
              <IconButton edge="end" onClick={() => toggleFavorite(v.id)}>
                {v.favorite ? <Star /> : <StarBorder />}
              </IconButton>
            }
          >
            <ListItemButton
              selected={selected?.id === v.id}
              onClick={() => setSelected(v)}
            >
              <ListItemText primary={v.preset} secondary={v.tags.join(", ")} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Button
        variant="contained"
        onClick={handleTest}
        disabled={!selected || !text.trim()}
      >
        Test
      </Button>
    </Box>
  );
}


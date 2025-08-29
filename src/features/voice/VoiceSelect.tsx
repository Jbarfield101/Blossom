import { useEffect, useState, useMemo } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  FormControlLabel,
  Checkbox,
  ListItemButton,
} from "@mui/material";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import { useVoices } from "../../store/voices";
import { useShallow } from "zustand/react/shallow";

interface VoiceSelectProps {
  selected?: string;
  onSelect?: (id: string) => void;
}

export default function VoiceSelect({ selected, onSelect }: VoiceSelectProps) {
  const { voices, load, addVoice, toggleFavorite } = useVoices(
    useShallow((s) => ({
      voices: s.voices,
      load: s.load,
      addVoice: s.addVoice,
      toggleFavorite: s.toggleFavorite,
    }))
  );
  const voiceFilter = useVoices((s) => s.filter);

  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    (async () => {
      await load();
      try {
        const res = await fetch("/higgs_voices.json");
        if (!res.ok) return;
        const data: { id: string; name?: string }[] = await res.json();
        const existing = useVoices.getState().voices;
        for (const v of data) {
          if (!existing.some((e) => e.id === v.id)) {
            await addVoice({ id: v.id, name: v.name, tags: [] });
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [load, addVoice]);

  const filteredVoices = useMemo(
    () =>
      voices
        .filter(voiceFilter)
        .filter((v) => !favoriteOnly || v.favorite)
        .filter(
          (v) =>
            !tagFilter ||
            v.tags.some((t) =>
              t.toLowerCase().includes(tagFilter.toLowerCase())
            )
        ),
    [voices, voiceFilter, favoriteOnly, tagFilter]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
              selected={selected === v.id}
              onClick={() => onSelect?.(v.id)}
            >
              <ListItemText
                primary={v.name ?? v.id}
                secondary={v.tags.join(", ")}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

import { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import { useShallow } from "zustand/react/shallow";
import { useVoices } from "../store/voices";

export default function Voices() {
  const { voices, load, toggleFavorite } = useVoices(
    useShallow((s) => ({
      voices: s.voices,
      load: s.load,
      toggleFavorite: s.toggleFavorite,
    }))
  );

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


  return (
    <Box
      sx={{
        p: 2,
        mt: 8,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
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
            <ListItemText primary={v.preset} secondary={v.tags.join(", ")} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}


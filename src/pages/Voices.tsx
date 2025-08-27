import { useEffect, useMemo } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useVoices } from "../store/voices";

export default function Voices() {
  const allVoices = useVoices((s) => s.voices);
  const voiceFilter = useVoices((s) => s.filter);
  const voices = useMemo(() => allVoices.filter(voiceFilter), [allVoices, voiceFilter]);
  const fetchVoices = useVoices((s) => s.fetchVoices);
  const toggleFavorite = useVoices((s) => s.toggleFavorite);
  const favoritesOnly = useVoices((s) => s.showFavoritesOnly);
  const toggleFavoritesOnly = useVoices((s) => s.toggleFavoritesOnly);

  useEffect(() => {
    if (!allVoices.length) fetchVoices();
  }, [allVoices.length, fetchVoices]);

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Button variant="contained" onClick={() => fetchVoices()} sx={{ mb: 2 }}>
        Reload
      </Button>
      <FormControlLabel
        control={
          <Checkbox
            icon={<StarBorderIcon />}
            checkedIcon={<StarIcon />}
            checked={favoritesOnly}
            onChange={toggleFavoritesOnly}
          />
        }
        label="Favorites only"
        sx={{ mb: 2 }}
      />
      <List>
        {voices.map((v) => (
          <ListItem
            key={v.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => toggleFavorite(v.id)}>
                {v.favorite ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            }
          >
            <ListItemText primary={v.preset} secondary={v.provider} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

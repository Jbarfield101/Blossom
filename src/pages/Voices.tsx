import { useEffect } from "react";
import { Box, Button, List, ListItem, ListItemText } from "@mui/material";
import { useShallow } from "zustand/react/shallow";
import { useVoices } from "../store/voices";

export default function Voices() {
  const { voices, fetchVoices } = useVoices(
    useShallow((s) => ({ voices: s.voices, fetchVoices: s.fetchVoices }))
  );

  useEffect(() => {
    if (!voices.length) fetchVoices();
  }, [voices.length, fetchVoices]);

  return (
    <Box sx={{ p: 2, color: "#fff" }}>
      <Button variant="contained" onClick={() => fetchVoices()} sx={{ mb: 2 }}>
        Reload
      </Button>
      <List>
        {voices.map((v) => (
          <ListItem key={v.id}>
            <ListItemText primary={v.preset} secondary={v.provider} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

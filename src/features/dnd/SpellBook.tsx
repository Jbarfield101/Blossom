import { useEffect, useState } from "react";
import { Box, TextField, Chip, Grid, Typography } from "@mui/material";
import { useSpells } from "../../store/spells";

export default function SpellBook() {
  const spells = useSpells((s) => s.spells);
  const loadSpells = useSpells((s) => s.loadSpells);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    loadSpells();
  }, [loadSpells]);

  const allTags = Array.from(new Set(spells.flatMap((s) => s.tags))).sort();

  const filtered = spells.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !tag || s.tags.includes(tag);
    return matchesSearch && matchesTag;
  });

  return (
    <Box>
      <TextField
        label="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Box sx={{ mb: 2 }}>
        {allTags.map((t) => (
          <Chip
            key={t}
            label={t}
            onClick={() => setTag(t === tag ? "" : t)}
            color={t === tag ? "primary" : "default"}
            sx={{ mr: 1, mb: 1 }}
          />
        ))}
      </Box>
      <Grid container spacing={2}>
        {filtered.map((spell) => (
          <Grid item xs={12} md={6} key={spell.id}>
            <Box sx={{ p: 2, border: 1, borderRadius: 1 }}>
              <Typography variant="h6">{spell.name}</Typography>
              <Typography variant="subtitle2" gutterBottom>
                Level {spell.level} {spell.school}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {spell.description}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {spell.tags.map((tg) => (
                  <Chip key={tg} size="small" label={tg} sx={{ mr: 1, mb: 1 }} />
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Typography>No spells found.</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

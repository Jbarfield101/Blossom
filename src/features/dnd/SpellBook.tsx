import { useEffect, useMemo, useState } from "react";
import { Box, Chip, List, ListItem, ListItemText, MenuItem, TextField, Typography } from "@mui/material";
import { useSpells } from "../../store/spells";

export default function SpellBook() {
  const spells = useSpells((s) => s.spells);
  const loadSpells = useSpells((s) => s.loadSpells);

  useEffect(() => {
    loadSpells();
  }, [loadSpells]);

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");

  const tags = useMemo(
    () => Array.from(new Set(spells.flatMap((s) => s.tags))).sort(),
    [spells]
  );

  const filtered = useMemo(
    () =>
      spells.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) &&
          (tag ? s.tags.includes(tag) : true)
      ),
    [spells, search, tag]
  );

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          select
          label="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          {tags.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <List>
        {filtered.length === 0 && (
          <ListItem>
            <ListItemText primary="No spells found" />
          </ListItem>
        )}
        {filtered.map((spell) => (
          <ListItem key={spell.id} alignItems="flex-start">
            <ListItemText
              primary={`${spell.name} (Level ${spell.level} ${spell.school})`}
              secondary={
                <>
                  <Typography component="span" variant="body2">
                    {spell.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {spell.tags.map((t) => (
                      <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />
                    ))}
                  </Box>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}


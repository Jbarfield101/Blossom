import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";
import { useRules } from "../../store/rules";

export default function RuleBook() {
  const rules = useRules((s) => s.rules);
  const loadRules = useRules((s) => s.loadRules);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const filtered = rules
    .filter((r) => {
      if (filter === "core") return r.tags.includes("core");
      if (filter === "custom") return !r.tags.includes("core");
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box id="rulebook">
      <Typography variant="h6" sx={{ mb: 2 }}>
        Rule Book
      </Typography>
      <FormControl sx={{ mb: 2, minWidth: 160 }} size="small">
        <InputLabel id="rule-filter-label">Filter</InputLabel>
        <Select
          labelId="rule-filter-label"
          value={filter}
          label="Filter"
          onChange={(e) => setFilter(e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="core">Core</MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>
      </FormControl>
      <Grid container spacing={2}>
        {filtered.map((rule) => (
          <Grid item xs={12} key={rule.id}>
            <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Typography variant="subtitle1">{rule.name}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {rule.description}
              </Typography>
            </Box>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Typography>No rules found.</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

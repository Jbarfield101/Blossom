import { useState } from "react";
import {
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
} from "@mui/material";
import StyledTextField from "./StyledTextField";
import { zRule } from "./schemas";
import type { RuleData } from "./types";
import rulesIndex from "../../../dnd/rules/index.json";
import RulePdfUpload from "./RulePdfUpload";
import { useRules } from "../../store/rules";

const ruleFiles = import.meta.glob("../../../dnd/rules/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const existingRules: RuleData[] = (rulesIndex as any).map((r: any) => ({
  id: r.id,
  name: r.name,
  description: (ruleFiles[`../../../${r.path}`] as string) || "",
  tags: r.tags,
}));

export default function RuleForm() {
  const [selectedId, setSelectedId] = useState("new");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<RuleData | null>(null);
  const [originalRule, setOriginalRule] = useState<RuleData | null>(null);
  const addRule = useRules((s) => s.addRule);

  const handleSelect = (e: any) => {
    const id = e.target.value;
    setSelectedId(id);
    if (id === "new") {
      setName("");
      setDescription("");
      setTags("");
      setOriginalRule(null);
    } else {
      const rule = existingRules.find((r) => r.id === id);
      if (rule) {
        setName(rule.name);
        setDescription(rule.description);
        setTags(rule.tags.join(", "));
        setOriginalRule(rule);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: RuleData = {
      id: crypto.randomUUID(),
      name,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ...(originalRule ? { sourceId: originalRule.id } : {}),
    };
    const parsed = zRule.parse(data);
    await addRule(parsed);
    setResult(parsed);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Rulebook</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <RulePdfUpload />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="rule-select-label">Base Rule</InputLabel>
            <Select
              labelId="rule-select-label"
              value={selectedId}
              label="Base Rule"
              onChange={handleSelect}
            >
              <MenuItem value="new">Create New Rule</MenuItem>
              {existingRules.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledTextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Submit
          </Button>
        </Grid>
        {result && (
          <Grid item xs={12}>
            <Box data-testid="rule-preview" sx={{ mt: 2 }}>
              {originalRule && (
                <Typography variant="subtitle2" color="text.secondary">
                  Based on: {originalRule.name}
                </Typography>
              )}
              <Typography variant="h6">{result.name}</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{result.description}</Typography>
              <Button href="#rulebook" sx={{ mt: 1 }}>
                View Rule Book
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

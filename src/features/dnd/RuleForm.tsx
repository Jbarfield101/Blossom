import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { zRule } from "./schemas";
import type { RuleData } from "./types";
import rulesIndex from "../../../dnd/rules/index.json";

const ruleFiles = import.meta.glob("../../../dnd/rules/*.md", {
  as: "raw",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: RuleData = {
      id: crypto.randomUUID(),
      name,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ...(originalRule ? { sourceId: originalRule.id } : {}),
    };
    const parsed = zRule.parse(data);
    setResult(parsed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6">Rulebook</Typography>
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
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        margin="normal"
      />
      <TextField
        label="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Submit
      </Button>
      {result && (
        <pre style={{ marginTop: "1rem" }}>
          {originalRule &&
            `Original:\n${JSON.stringify(originalRule, null, 2)}\n\n`}
          {`Custom:\n${JSON.stringify(result, null, 2)}`}
        </pre>
      )}
    </form>
  );
}

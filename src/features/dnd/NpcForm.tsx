import { useReducer, useState, useEffect, useMemo } from "react";
import {
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import FormErrorText from "./FormErrorText";
import { zNpc } from "../../dnd/schemas/npc";
import { NpcData } from "./types";
import NpcPdfUpload from "./NpcPdfUpload";
import StyledTextField from "./StyledTextField";
import { useVoices } from "../../store/voices";
import { useNPCs } from "../../store/npcs";
import { invoke } from "@tauri-apps/api/core";

interface FormState {
  id: string;
  name: string;
  species: string;
  role: string;
  alignment: string;
  playerCharacter: boolean;
  age: string;
  backstory: string;
  location: string;
  hooks: string;
  quirks: string;
  appearance: string;
  tags: string;
  portrait: string;
  icon: string;
  statblock: string;
  sections: string;
  voiceId: string;
  level: string;
  hp: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  inventory: string;
}

const initialState: FormState = {
  id: "",
  name: "",
  species: "",
  role: "",
  alignment: "",
  playerCharacter: false,
  age: "",
  backstory: "",
  location: "",
  hooks: "",
  quirks: "",
  appearance: "",
  tags: "",
  portrait: "",
  icon: "",
  statblock: "{}",
  sections: "{}",
  voiceId: "",
  level: "",
  hp: "",
  strength: "",
  dexterity: "",
  constitution: "",
  intelligence: "",
  wisdom: "",
  charisma: "",
  inventory: "",
};

type Action =
  | {
      type: "SET_FIELD";
      field: keyof FormState;
      value: string | boolean;
    }
  | { type: "RESET" };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value } as FormState;
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

interface Props {
  world: string;
}

export default function NpcForm({ world }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const allVoices = useVoices((s) => s.voices);
  const voiceFilter = useVoices((s) => s.filter);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const voices = useMemo(
    () =>
      allVoices
        .filter(voiceFilter)
        .filter((v) => !favoriteOnly || v.favorite),
    [allVoices, voiceFilter, favoriteOnly]
  );
  const toggleFavorite = useVoices((s) => s.toggleFavorite);
  const loadVoices = useVoices((s) => s.load);
  const loadNPCs = useNPCs((s) => s.loadNPCs);
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);
  const voiceOptions = voices;
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<NpcData | null>(null);
  const [importedName, setImportedName] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleFileChange =
    (field: "portrait" | "icon") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        dispatch({ type: "SET_FIELD", field, value: file.name });
      }
    };

  const handleJsonImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const npc = zNpc.parse(JSON.parse(text));
      setImportedName(npc.name);
      dispatch({ type: "SET_FIELD", field: "id", value: npc.id });
      dispatch({ type: "SET_FIELD", field: "name", value: npc.name });
      dispatch({ type: "SET_FIELD", field: "species", value: npc.species });
      dispatch({ type: "SET_FIELD", field: "role", value: npc.role });
      dispatch({ type: "SET_FIELD", field: "alignment", value: npc.alignment });
      dispatch({ type: "SET_FIELD", field: "playerCharacter", value: npc.playerCharacter });
      dispatch({ type: "SET_FIELD", field: "age", value: npc.age?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "backstory", value: npc.backstory || "" });
      dispatch({ type: "SET_FIELD", field: "location", value: npc.location || "" });
      dispatch({ type: "SET_FIELD", field: "hooks", value: (npc.hooks || []).join(", ") });
      dispatch({ type: "SET_FIELD", field: "quirks", value: (npc.quirks || []).join(", ") });
      dispatch({ type: "SET_FIELD", field: "appearance", value: npc.appearance || "" });
      dispatch({ type: "SET_FIELD", field: "tags", value: (npc.tags || []).join(", ") });
      dispatch({ type: "SET_FIELD", field: "portrait", value: npc.portrait || "" });
      dispatch({ type: "SET_FIELD", field: "icon", value: npc.icon || "" });
      dispatch({
        type: "SET_FIELD",
        field: "statblock",
        value: JSON.stringify(npc.statblock || {}, null, 2),
      });
      dispatch({
        type: "SET_FIELD",
        field: "sections",
        value: JSON.stringify(npc.sections || {}, null, 2),
      });
      dispatch({ type: "SET_FIELD", field: "voiceId", value: npc.voiceId || "" });
      dispatch({ type: "SET_FIELD", field: "level", value: npc.level?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "hp", value: npc.hp?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "inventory", value: (npc.inventory || []).join(", ") });
      dispatch({ type: "SET_FIELD", field: "strength", value: npc.abilities?.strength?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "dexterity", value: npc.abilities?.dexterity?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "constitution", value: npc.abilities?.constitution?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "intelligence", value: npc.abilities?.intelligence?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "wisdom", value: npc.abilities?.wisdom?.toString() || "" });
      dispatch({ type: "SET_FIELD", field: "charisma", value: npc.abilities?.charisma?.toString() || "" });
    } catch {
      setErrors({ json: "Invalid JSON" });
      setImportedName(null);
    }
  };

  const handleExportJson = () => {
    setErrors({});
    let parsedStatblock: Record<string, unknown> = {};
    try {
      parsedStatblock = JSON.parse(state.statblock || "{}");
    } catch {
      setErrors({ statblock: "Invalid JSON" });
      return;
    }

    let parsedSections: Record<string, unknown> = {};
    try {
      parsedSections = JSON.parse(state.sections || "{}");
    } catch {
      setErrors({ sections: "Invalid JSON" });
      return;
    }

    const abilities: Record<string, number> = {};
    const abilityKeys = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ] as const;
    for (const key of abilityKeys) {
      const value = (state as any)[key] as string;
      if (value) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          setErrors((prev) => ({ ...prev, [`abilities.${key}`]: "Invalid number" }));
          return;
        }
        abilities[key] = num;
      }
    }

    const inventory = state.inventory
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const data: NpcData = {
      id: state.id || crypto.randomUUID(),
      name: state.name,
      species: state.species,
      role: state.role,
      alignment: state.alignment,
      playerCharacter: state.playerCharacter,
      age: state.age ? parseInt(state.age, 10) : undefined,
      backstory: state.backstory || undefined,
      location: state.location || undefined,
      hooks: state.hooks.split(",").map((h) => h.trim()).filter(Boolean),
      quirks: state.quirks
        ? state.quirks.split(",").map((q) => q.trim()).filter(Boolean)
        : undefined,
      appearance: state.appearance || undefined,
      voiceId: state.voiceId || undefined,
      portrait: state.portrait || "placeholder.png",
      icon: state.icon || "placeholder-icon.png",
      sections: Object.keys(parsedSections).length ? parsedSections : undefined,
      statblock: parsedStatblock,
      tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
      level: state.level ? parseInt(state.level, 10) : undefined,
      hp: state.hp ? parseInt(state.hp, 10) : undefined,
      abilities: Object.keys(abilities).length ? (abilities as any) : undefined,
      inventory: inventory.length ? inventory : undefined,
    };

    const parsed = zNpc.safeParse(data);
    if (parsed.success) {
      const blob = new Blob([JSON.stringify(parsed.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${parsed.data.name || "npc"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const fieldErrors: Record<string, string | null> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let parsedStatblock: Record<string, unknown> = {};
    try {
      parsedStatblock = JSON.parse(state.statblock || "{}");
    } catch {
      setErrors({ statblock: "Invalid JSON" });
      setResult(null);
      return;
    }

    let parsedSections: Record<string, unknown> = {};
    try {
      parsedSections = JSON.parse(state.sections || "{}");
    } catch {
      setErrors({ sections: "Invalid JSON" });
      setResult(null);
      return;
    }

    const abilities: Record<string, number> = {};
    const abilityKeys = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ] as const;
    for (const key of abilityKeys) {
      const value = (state as any)[key] as string;
      if (value) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          setErrors({ [`abilities.${key}`]: "Invalid number" });
          setResult(null);
          return;
        }
        abilities[key] = num;
      }
    }

    const inventory = state.inventory
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const data: NpcData = {
      id: state.id || crypto.randomUUID(),
      name: state.name,
      species: state.species,
      role: state.role,
      alignment: state.alignment,
      playerCharacter: state.playerCharacter,
      age: state.age ? parseInt(state.age, 10) : undefined,
      backstory: state.backstory || undefined,
      location: state.location || undefined,
      hooks: state.hooks.split(",").map((h) => h.trim()).filter(Boolean),
      quirks: state.quirks
        ? state.quirks.split(",").map((q) => q.trim()).filter(Boolean)
        : undefined,
      appearance: state.appearance || undefined,
      voiceId: state.voiceId || undefined,
      portrait: state.portrait || "placeholder.png",
      icon: state.icon || "placeholder-icon.png",
      sections: Object.keys(parsedSections).length ? parsedSections : undefined,
      statblock: parsedStatblock,
      tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
      level: state.level ? parseInt(state.level, 10) : undefined,
      hp: state.hp ? parseInt(state.hp, 10) : undefined,
      abilities: Object.keys(abilities).length ? (abilities as any) : undefined,
      inventory: inventory.length ? inventory : undefined,
    };

    const parsed = zNpc.safeParse(data);
    if (parsed.success) {
      try {
        const saved = await invoke<NpcData>("save_npc", { world, npc: parsed.data });
        await loadNPCs(world);
        setResult(saved);
        dispatch({ type: "RESET" });
        setImportedName(null);
        setErrors({});
        setSnackbarMessage(`NPC ${saved.name} saved successfully`);
        setSnackbarOpen(true);
      } catch (err) {
        setErrors({ submit: String(err) });
        setResult(null);
      }
    } else {
      setResult(null);
      const fieldErrors: Record<string, string | null> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
    }
  };
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">NPC Form</Typography>
        </Grid>

        {/* Identity */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Identity</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <Typography component="label">Upload NPC PDF</Typography>
            </Grid>
            <Grid item xs={8}>
              <NpcPdfUpload
                world={world}
                onParsed={(npcs) => {
                  const npc = npcs[0];
                  if (!npc) return;
                  setImportedName(npc.name);
                  dispatch({ type: "SET_FIELD", field: "id", value: npc.id });
                  dispatch({ type: "SET_FIELD", field: "name", value: npc.name });
                  dispatch({ type: "SET_FIELD", field: "species", value: npc.species });
                  dispatch({ type: "SET_FIELD", field: "role", value: npc.role });
                  dispatch({ type: "SET_FIELD", field: "alignment", value: npc.alignment });
                  dispatch({ type: "SET_FIELD", field: "playerCharacter", value: npc.playerCharacter });
                  dispatch({ type: "SET_FIELD", field: "age", value: npc.age?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "backstory", value: npc.backstory || "" });
                  dispatch({ type: "SET_FIELD", field: "location", value: npc.location || "" });
                  dispatch({ type: "SET_FIELD", field: "hooks", value: (npc.hooks || []).join(", ") });
                  dispatch({ type: "SET_FIELD", field: "quirks", value: (npc.quirks || []).join(", ") });
                  dispatch({ type: "SET_FIELD", field: "appearance", value: npc.appearance || "" });
                  dispatch({ type: "SET_FIELD", field: "tags", value: (npc.tags || []).join(", ") });
                  dispatch({ type: "SET_FIELD", field: "portrait", value: npc.portrait || "" });
                  dispatch({ type: "SET_FIELD", field: "icon", value: npc.icon || "" });
                  dispatch({
                    type: "SET_FIELD",
                    field: "statblock",
                    value: JSON.stringify(npc.statblock || {}, null, 2),
                  });
                  dispatch({
                    type: "SET_FIELD",
                    field: "sections",
                    value: JSON.stringify(npc.sections || {}, null, 2),
                  });
                  dispatch({ type: "SET_FIELD", field: "voiceId", value: npc.voiceId || "" });
                  dispatch({ type: "SET_FIELD", field: "level", value: npc.level?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "hp", value: npc.hp?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "inventory", value: (npc.inventory || []).join(", ") });
                  dispatch({ type: "SET_FIELD", field: "strength", value: npc.abilities?.strength?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "dexterity", value: npc.abilities?.dexterity?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "constitution", value: npc.abilities?.constitution?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "intelligence", value: npc.abilities?.intelligence?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "wisdom", value: npc.abilities?.wisdom?.toString() || "" });
                  dispatch({ type: "SET_FIELD", field: "charisma", value: npc.abilities?.charisma?.toString() || "" });
                }}
              />
              {importedName && (
                <Typography sx={{ mt: 1 }}>Imported: {importedName}</Typography>
              )}
            </Grid>
            <Grid item xs={4}>
              <Typography component="label">Import NPC JSON</Typography>
            </Grid>
            <Grid item xs={8}>
              <input
                type="file"
                id="npc-json"
                data-testid="npc-json-input"
                accept="application/json"
                hidden
                onChange={handleJsonImport}
              />
              <Button
                variant="outlined"
                onClick={() => document.getElementById("npc-json")?.click()}
                sx={{ mt: 1 }}
              >
                Import JSON
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportJson}
                sx={{ mt: 1, ml: 1 }}
              >
                Export JSON
              </Button>
              {errors.json && (
                <FormErrorText id="json-error">{errors.json}</FormErrorText>
              )}
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="name"
                label="Name"
                value={state.name}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "name", value: e.target.value });
                  setErrors((prev) => ({ ...prev, name: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.name)}
                helperText={
                  <FormErrorText id="name-error">{errors.name}</FormErrorText>
                }
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="species"
                label="Species"
                value={state.species}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "species", value: e.target.value });
                  setErrors((prev) => ({ ...prev, species: null }));
                }}
                fullWidth
                margin="normal"
                placeholder="Elf"
                error={Boolean(errors.species)}
                helperText={
                  <FormErrorText id="species-error">
                    {errors.species}
                  </FormErrorText>
                }
                aria-describedby={errors.species ? "species-error" : undefined}
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="role"
                label="Role"
                value={state.role}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "role", value: e.target.value });
                  setErrors((prev) => ({ ...prev, role: null }));
                }}
                fullWidth
                margin="normal"
                placeholder="Blacksmith"
                error={Boolean(errors.role)}
                helperText={
                  <FormErrorText id="role-error">{errors.role}</FormErrorText>
                }
                aria-describedby={errors.role ? "role-error" : undefined}
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="alignment"
                label="Alignment"
                value={state.alignment}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "alignment", value: e.target.value });
                  setErrors((prev) => ({ ...prev, alignment: null }));
                }}
                fullWidth
                margin="normal"
                placeholder="Chaotic Good"
                error={Boolean(errors.alignment)}
                helperText={
                  <FormErrorText id="alignment-error">
                    {errors.alignment}
                  </FormErrorText>
                }
                aria-describedby={
                  errors.alignment ? "alignment-error" : undefined
                }
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="age"
                label="Age"
                type="number"
                value={state.age}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "age", value: e.target.value });
                  setErrors((prev) => ({ ...prev, age: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.age)}
                helperText={<FormErrorText id="age-error">{errors.age}</FormErrorText>}
                aria-describedby={errors.age ? "age-error" : undefined}
              />
            </Grid>
            <Grid item xs={4}>
              <Typography component="label" htmlFor="player-character">
                Player Character
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Checkbox
                id="player-character"
                checked={state.playerCharacter}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "playerCharacter",
                    value: e.target.checked,
                  })
                }
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

        {/* Stats */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Stats</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
            <Grid item xs={6}>
              <StyledTextField
                id="level"
                label="Level"
                type="number"
                value={state.level}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "level", value: e.target.value });
                  setErrors((prev) => ({ ...prev, level: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.level)}
                helperText={<FormErrorText id="level-error">{errors.level}</FormErrorText>}
                aria-describedby={errors.level ? "level-error" : undefined}
              />
            </Grid>
            <Grid item xs={6}>
              <StyledTextField
                id="hp"
                label="HP"
                type="number"
                value={state.hp}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "hp", value: e.target.value });
                  setErrors((prev) => ({ ...prev, hp: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.hp)}
                helperText={<FormErrorText id="hp-error">{errors.hp}</FormErrorText>}
                aria-describedby={errors.hp ? "hp-error" : undefined}
              />
            </Grid>
            {[
              "strength",
              "dexterity",
              "constitution",
              "intelligence",
              "wisdom",
              "charisma",
            ].map((ability) => (
              <Grid item xs={6} key={ability}>
                <StyledTextField
                  id={ability}
                  label={ability.charAt(0).toUpperCase() + ability.slice(1)}
                  type="number"
                  placeholder="10"
                  value={(state as any)[ability]}
                  onChange={(e) => {
                    dispatch({ type: "SET_FIELD", field: ability as any, value: e.target.value });
                    setErrors((prev) => ({ ...prev, [`abilities.${ability}`]: null }));
                  }}
                  fullWidth
                  margin="normal"
                  error={Boolean(errors[`abilities.${ability}`])}
                  helperText={
                    <FormErrorText id={`${ability}-error`}>
                      {errors[`abilities.${ability}`]}
                    </FormErrorText>
                  }
                  aria-describedby={
                    errors[`abilities.${ability}`] ? `${ability}-error` : undefined
                  }
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <StyledTextField
                id="inventory"
                label={
                  <Tooltip title="Example: torch, rope, shield">
                    <span>Inventory/Equipment (comma separated)</span>
                  </Tooltip>
                }
                placeholder="torch, rope, shield"
                value={state.inventory}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "inventory", value: e.target.value });
                  setErrors((prev) => ({ ...prev, inventory: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.inventory)}
                helperText={
                  <FormErrorText id="inventory-error">{errors.inventory}</FormErrorText>
                }
                aria-describedby={
                  errors.inventory ? "inventory-error" : undefined
                }
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

        {/* Details */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <StyledTextField
                id="backstory"
                label="Backstory"
                value={state.backstory}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "backstory", value: e.target.value })
                }
                fullWidth
                margin="normal"
                multiline
                minRows={4}
                maxRows={12}
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="location"
                label="Location"
                value={state.location}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "location", value: e.target.value })
                }
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="hooks"
                label={
                  <Tooltip title="Example: owes party a favor">
                    <span>Hooks (comma separated)</span>
                  </Tooltip>
                }
                placeholder="owes party a favor"
                value={state.hooks}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "hooks", value: e.target.value });
                  setErrors((prev) => ({ ...prev, hooks: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.hooks)}
                helperText={
                  <FormErrorText id="hooks-error">{errors.hooks}</FormErrorText>
                }
                aria-describedby={errors.hooks ? "hooks-error" : undefined}
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="quirks"
                label="Personality (comma separated)"
                value={state.quirks}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "quirks", value: e.target.value })
                }
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <StyledTextField
                id="tags"
                label="Tags (comma separated)"
                value={state.tags}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", field: "tags", value: e.target.value });
                  setErrors((prev) => ({ ...prev, tags: null }));
                }}
                fullWidth
                margin="normal"
                error={Boolean(errors.tags)}
                helperText={
                  <FormErrorText id="tags-error">{errors.tags}</FormErrorText>
                }
                aria-describedby={errors.tags ? "tags-error" : undefined}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

        {/* Media */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Media</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <label htmlFor="portrait">Portrait</label>
            </Grid>
            <Grid item xs={8}>
              <input
                type="file"
                id="portrait"
                hidden
                onChange={handleFileChange("portrait")}
              />
              <Button
                variant="outlined"
                onClick={() =>
                  document.getElementById("portrait")?.click()
                }
                sx={{ mt: 1 }}
              >
                Upload Portrait
              </Button>
              {state.portrait && (
                <Typography sx={{ mt: 1 }}>{state.portrait}</Typography>
              )}
            </Grid>
            <Grid item xs={4}>
              <label htmlFor="icon">Icon</label>
            </Grid>
            <Grid item xs={8}>
              <input
                type="file"
                id="icon"
                hidden
                onChange={handleFileChange("icon")}
              />
              <Button
                variant="outlined"
                onClick={() => document.getElementById("icon")?.click()}
                sx={{ mt: 1 }}
              >
                Upload Icon
              </Button>
              {state.icon && <Typography sx={{ mt: 1 }}>{state.icon}</Typography>}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

      {/* Settings */}
      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Voice Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={favoriteOnly}
                        onChange={(e) => setFavoriteOnly(e.target.checked)}
                      />
                    }
                    label="Favorites"
                  />
                  <Autocomplete
                    options={voiceOptions}
                    getOptionLabel={(v) => v.id}
                    value={voiceOptions.find((v) => v.id === state.voiceId) || null}
                    onChange={(_e, v) => {
                      dispatch({
                        type: "SET_FIELD",
                        field: "voiceId",
                        value: v?.id || "",
                      });
                      setErrors((prev) => ({ ...prev, voiceId: null }));
                    }}
                    renderOption={(props, option) => (
                      <Box
                        component="li"
                        {...props}
                        sx={{ display: "flex", justifyContent: "space-between" }}
                      >
                        {option.id}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(option.id);
                          }}
                        >
                          {option.favorite ? (
                            <StarIcon fontSize="small" />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <StyledTextField
                        {...params}
                        id="voiceId"
                        label="Voice"
                        margin="normal"
                        error={Boolean(errors.voiceId)}
                        helperText={
                          <FormErrorText id="voiceId-error">
                            {errors.voiceId}
                          </FormErrorText>
                        }
                        aria-describedby={
                          errors.voiceId ? "voiceId-error" : undefined
                        }
                      />
                    )}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          <Accordion defaultExpanded={false} sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced JSON</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <StyledTextField
                    id="statblock"
                    label={
                      <Tooltip title="Enter valid JSON; see docs">
                        <span>Statblock JSON</span>
                      </Tooltip>
                    }
                    placeholder='{"hp": 10}'
                    value={state.statblock}
                    onChange={(e) => {
                      dispatch({ type: "SET_FIELD", field: "statblock", value: e.target.value });
                      setErrors((prev) => ({ ...prev, statblock: null }));
                    }}
                    fullWidth
                    margin="normal"
                    multiline
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.statblock)}
                    helperText={
                      errors.statblock ? (
                        <FormErrorText id="statblock-error">
                          {errors.statblock}
                        </FormErrorText>
                      ) : (
                        "Enter valid JSON; see docs"
                      )
                    }
                    aria-describedby={
                      errors.statblock ? "statblock-error" : undefined
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <StyledTextField
                    id="sections"
                    label={
                      <Tooltip title="Enter valid JSON; see docs">
                        <span>Custom Sections JSON</span>
                      </Tooltip>
                    }
                    placeholder='{"notes": "Allies"}'
                    value={state.sections}
                    onChange={(e) => {
                      dispatch({ type: "SET_FIELD", field: "sections", value: e.target.value });
                      setErrors((prev) => ({ ...prev, sections: null }));
                    }}
                    fullWidth
                    margin="normal"
                    multiline
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.sections)}
                    helperText={
                      errors.sections ? (
                        <FormErrorText id="sections-error">
                          {errors.sections}
                        </FormErrorText>
                      ) : (
                        "Enter valid JSON; see docs"
                      )
                    }
                    aria-describedby={
                      errors.sections ? "sections-error" : undefined
                    }
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </AccordionDetails>
      </Accordion>
    </Grid>

    <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                fontWeight: "bold",
                "&:hover,&:focus": { boxShadow: "0 0 8px #0f0" },
              }}
            >
              Submit
            </Button>
          </Box>
        </Grid>
        {result && (
          <Grid item xs={12}>
            <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>
          </Grid>
        )}
      </Grid>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

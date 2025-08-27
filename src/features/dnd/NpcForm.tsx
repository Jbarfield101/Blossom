import { useReducer, useState, useEffect, useMemo } from "react";
import {
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Box,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  IconButton,
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
import { open } from "@tauri-apps/plugin-dialog";

interface FormState {
  name: string;
  species: string;
  role: string;
  alignment: string;
  playerCharacter: boolean;
  backstory: string;
  location: string;
  hooks: string;
  quirks: string;
  tags: string;
  portrait: string;
  icon: string;
  statblock: string;
  sections: string;
  voiceId: string;
}

const initialState: FormState = {
  name: "",
  species: "",
  role: "",
  alignment: "",
  playerCharacter: false,
  backstory: "",
  location: "",
  hooks: "",
  quirks: "",
  tags: "",
  portrait: "",
  icon: "",
  statblock: "{}",
  sections: "{}",
  voiceId: "",
};

type Action = {
  type: "SET_FIELD";
  field: keyof FormState;
  value: string | boolean;
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value } as FormState;
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
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);
  const voiceOptions = voices;
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<NpcData | null>(null);
  const [importedName, setImportedName] = useState<string | null>(null);

  const selectFile = async (field: "portrait" | "icon") => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
    });
    if (typeof selected === "string") {
      dispatch({ type: "SET_FIELD", field, value: selected });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const data: NpcData = {
      id: crypto.randomUUID(),
      name: state.name,
      species: state.species,
      role: state.role,
      alignment: state.alignment,
      playerCharacter: state.playerCharacter,
      backstory: state.backstory || undefined,
      location: state.location || undefined,
      hooks: state.hooks.split(",").map((h) => h.trim()).filter(Boolean),
      quirks: state.quirks
        ? state.quirks.split(",").map((q) => q.trim()).filter(Boolean)
        : undefined,
      voiceId: state.voiceId || undefined,
      portrait: state.portrait || "placeholder.png",
      icon: state.icon || "placeholder-icon.png",
      sections: Object.keys(parsedSections).length ? parsedSections : undefined,
      statblock: parsedStatblock,
      tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    const parsed = zNpc.safeParse(data);
    if (parsed.success) {
      setResult(parsed.data);
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
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Identity
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
                  dispatch({ type: "SET_FIELD", field: "name", value: npc.name });
                  dispatch({ type: "SET_FIELD", field: "species", value: npc.species });
                  dispatch({ type: "SET_FIELD", field: "role", value: npc.role });
                  dispatch({ type: "SET_FIELD", field: "alignment", value: npc.alignment });
                  dispatch({ type: "SET_FIELD", field: "playerCharacter", value: npc.playerCharacter });
                  dispatch({ type: "SET_FIELD", field: "backstory", value: npc.backstory || "" });
                  dispatch({ type: "SET_FIELD", field: "location", value: npc.location || "" });
                  dispatch({ type: "SET_FIELD", field: "hooks", value: (npc.hooks || []).join(", ") });
                  dispatch({ type: "SET_FIELD", field: "quirks", value: (npc.quirks || []).join(", ") });
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
                }}
              />
              {importedName && (
                <Typography sx={{ mt: 1 }}>Imported: {importedName}</Typography>
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
        </Grid>

        {/* Details */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
                label="Hooks (comma separated)"
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
                label="Quirks (comma separated)"
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
        </Grid>

        {/* Media */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Media
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <Typography component="label" htmlFor="portrait">
                Portrait
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Button
                variant="outlined"
                onClick={() => selectFile("portrait")}
                sx={{ mt: 1 }}
              >
                Upload Portrait
              </Button>
              {state.portrait && (
                <Typography sx={{ mt: 1 }}>{state.portrait}</Typography>
              )}
            </Grid>
            <Grid item xs={4}>
              <Typography component="label" htmlFor="icon">
                Icon
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Button
                variant="outlined"
                onClick={() => selectFile("icon")}
                sx={{ mt: 1 }}
              >
                Upload Icon
              </Button>
              {state.icon && <Typography sx={{ mt: 1 }}>{state.icon}</Typography>}
            </Grid>
          </Grid>
        </Grid>

        {/* Settings */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Settings
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
                    label="Statblock JSON"
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
                      <FormErrorText id="statblock-error">
                        {errors.statblock}
                      </FormErrorText>
                    }
                    aria-describedby={
                      errors.statblock ? "statblock-error" : undefined
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <StyledTextField
                    id="sections"
                    label="Custom Sections JSON"
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
                      <FormErrorText id="sections-error">
                        {errors.sections}
                      </FormErrorText>
                    }
                    aria-describedby={
                      errors.sections ? "sections-error" : undefined
                    }
                  />
                </Grid>
              </Grid>
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
    </Box>
  );
}

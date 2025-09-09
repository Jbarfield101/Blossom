import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  List,
  ListItemButton,
  ListItemText,
  Autocomplete,
  Breadcrumbs,
    CircularProgress,
    Alert,
  } from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { useSettings, type ModuleKey, type WidgetKey } from "../features/settings/useSettings";
import { usePaths } from "../features/paths/usePaths";
import { useOutput } from "../features/output/useOutput";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";
import { useTheme, type Theme } from "../features/theme/ThemeContext";
import { useComfyTutorial } from "../features/comfyTutorial/useComfyTutorial";
import { useUsers } from "../features/users/useUsers";
import VoiceSettings from "../features/settings/VoiceSettings";
import HelpIcon from "./HelpIcon";
import CreateUserDialog from "./CreateUserDialog";

const KEY_OPTIONS = [
  "Auto",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Am",
  "Em",
  "Dm",
];
const displayKey = (k: string) => k.replace("#", "♯").replace("b", "♭");

const THEME_PREVIEWS: Record<Theme, string> = {
  default: "#3d0a0a",
  forest: "#228b22",
  sunset: "#5e2a0a",
  sakura: "#5e0a3d",
  studio: "#000",
  galaxy: "#000",
  retro: "#000",
  noir: "#1a1a1a",
  aurora: "linear-gradient(270deg,#00ffa3,#0085ff)",
  rainy: "#0a1e3d",
  pastel: "#ffe4e1",
  mono: "#000",
  eclipse: "#000",
};

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "forest", label: "Forest" },
  { value: "sunset", label: "Sunset" },
  { value: "sakura", label: "Sakura" },
  { value: "studio", label: "Studio" },
  { value: "galaxy", label: "Galaxy" },
  { value: "retro", label: "Retro" },
  { value: "noir", label: "Noir" },
  { value: "aurora", label: "Aurora" },
  { value: "rainy", label: "Rainy" },
  { value: "pastel", label: "Pastel" },
  { value: "mono", label: "Mono" },
  { value: "eclipse", label: "Eclipse" },
];

const THEME_GROUPS: { label: string; options: { value: Theme; label: string }[] }[] = [
  {
    label: "Light",
    options: THEME_OPTIONS.filter((o) => ["pastel"].includes(o.value)),
  },
  {
    label: "Dark",
    options: THEME_OPTIONS.filter((o) =>
      [
        "default",
        "forest",
        "sunset",
        "sakura",
        "studio",
        "galaxy",
        "noir",
        "rainy",
        "eclipse",
      ].includes(o.value),
    ),
  },
  {
    label: "High Contrast",
    options: THEME_OPTIONS.filter((o) => ["aurora", "retro", "mono"].includes(o.value)),
  },
];

const MODULE_LABELS: Partial<Record<ModuleKey, string>> = {
  objects: "3D Object",
  calendar: "Calendar",
  comfy: "ComfyUI",
  assistant: "AI Assistant",
  laser: "Laser Lab",
  fusion: "Fusion",
  simulation: "Simulation",
  voices: "Voices",
  shorts: "Shorts",
  chores: "Chores",
  construction: "Under Construction",
  video: "Video Editor",
};

const WIDGET_LABELS: Record<WidgetKey, string> = {
  homeChat: "Home Chat",
  systemInfo: "System Info",
  tasks: "Tasks",
};

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function PathField({
  id,
  label,
  value,
  onChange,
  directory,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (p: string) => void;
  directory?: boolean;
}) {
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!value) {
        setInvalid(false);
        return;
      }
      try {
        const exists = await invoke<boolean>("plugin:fs|exists", { path: value });
        setInvalid(!exists);
      } catch {
        setInvalid(true);
      }
    }
    validate();
  }, [value]);

  return (
    <Box sx={{ mt: 1 }} id={id}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        error={invalid}
        helperText={invalid ? "Path does not exist" : undefined}
      />
      <Button
        variant="outlined"
        sx={{ mt: 1 }}
        onClick={async () => {
          const res = await open(directory ? { directory: true } : {});
          if (typeof res === "string") onChange(res);
        }}
      >
        Browse
      </Button>
    </Box>
  );
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const {
    pythonPath,
    defaultPythonPath,
    setPythonPath,
    error: pathsError,
    clearError: clearPathsError,
  } = usePaths();
  const { folder, setFolder } = useOutput();
  const {
    bpm,
    setBpm,
    key,
    setKey,
    hqStereo,
    toggleHqStereo,
    hqReverb,
    toggleHqReverb,
    hqSidechain,
    toggleHqSidechain,
    hqChorus,
    toggleHqChorus,
    micEnabled,
    toggleMicEnabled,
  } = useAudioDefaults();
  const { theme, setTheme } = useTheme();
  const currentUserId = useUsers((state) => state.currentUserId);
  const users = useUsers((s) => s.users);
  const switchUser = useUsers((s) => s.switchUser);
  const setRetroTvMedia = useUsers((s) => s.setRetroTvMedia);
  const hasUser = currentUserId !== null;
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const { showTutorial, setShowTutorial } = useComfyTutorial();
  const { modules, toggleModule, widgets, toggleWidget } = useSettings();
  const [audioSaved, setAudioSaved] = useState(false);
  const [pathsSaved, setPathsSaved] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [outputSaved, setOutputSaved] = useState(false);
  const [ambienceMessage, setAmbienceMessage] = useState<string | null>(null);
  const [generatingAmbience, setGeneratingAmbience] = useState(false);

  const [pythonDraft, setPythonDraft] = useState(pythonPath);
  const [folderDraft, setFolderDraft] = useState(folder);
  const [themeDraft, setThemeDraft] = useState<Theme>(theme);
  const [editPython, setEditPython] = useState(false);

  useEffect(() => setPythonDraft(pythonPath), [pythonPath]);
  useEffect(() => setFolderDraft(folder), [folder]);
  useEffect(() => setThemeDraft(theme), [theme]);
  type Section =
    | "user"
    | "environment"
    | "editor"
    | "appearance"
    | "integrations"
    | "voices";
  const sectionLabels: Record<Section, string> = {
    user: "User",
    environment: "Environment",
    editor: "Editor",
    appearance: "Appearance",
    integrations: "Integrations",
    voices: "Voices",
  };
  const [section, setSection] = useState<Section>("environment");
  const [searchValue, setSearchValue] = useState("");

  const baseIndex = [
    { label: "Current User", section: "user" as Section, elementId: "current-user" },
    { label: "Python Path", section: "environment" as Section, elementId: "python-path" },
    { label: "Default Save Folder", section: "environment" as Section, elementId: "output-folder" },
    {
      label: "Enable Microphone",
      section: "editor" as Section,
      elementId: "mic-enabled",
    },
    { label: "BPM", section: "editor" as Section, elementId: "bpm" },
    { label: "Key", section: "editor" as Section, elementId: "key" },
    { label: "HQ Stereo", section: "editor" as Section, elementId: "hq-stereo" },
    { label: "HQ Reverb", section: "editor" as Section, elementId: "hq-reverb" },
    { label: "HQ Sidechain", section: "editor" as Section, elementId: "hq-sidechain" },
    { label: "HQ Chorus", section: "editor" as Section, elementId: "hq-chorus" },
    ...(hasUser
      ? [{ label: "Theme", section: "appearance" as Section, elementId: "theme" }]
      : []),
    {
      label: "Show ComfyUI Tutorial",
      section: "integrations" as Section,
      elementId: "show-tutorial",
    },
    {
      label: "Voices",
      section: "voices" as Section,
      elementId: "voice-settings",
    },
  ];
  const moduleIndex = (Object.entries(MODULE_LABELS) as [ModuleKey, string][]) .map(
    ([key, label]) => ({ label, section: "integrations" as Section, elementId: `module-${key}` })
  );
  const widgetIndex = (Object.entries(WIDGET_LABELS) as [WidgetKey, string][]).map(
    ([key, label]) => ({ label, section: "integrations" as Section, elementId: `widget-${key}` })
  );
  const searchIndex = [...baseIndex, ...moduleIndex, ...widgetIndex];

  const handleSearchSelect = (value: string | null) => {
    if (!value) return;
    const item = searchIndex.find((i) => i.label === value);
    if (item) {
      if (item.elementId === "python-path") setEditPython(true);
      setSection(item.section);
      setTimeout(() => {
        document.getElementById(item.elementId)?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  };

  const handleRetroVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const ext = file.name.split(".").pop() || "mp4";
      try {
        const path: string = await invoke("save_retro_tv_video", {
          data: base64,
          ext,
        });
        const video = document.createElement("video");
        video.src = dataUrl;
        video.addEventListener(
          "loadedmetadata",
          () =>
            setRetroTvMedia({
              path,
              width: video.videoWidth,
              height: video.videoHeight,
            }),
          { once: true }
        );
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const EnvironmentSection = () => (
    <>
      <Typography variant="subtitle1">Paths</Typography>
      {!editPython ? (
        <Button
          variant="outlined"
          sx={{ mt: 1, mb: 1 }}
          onClick={() => setEditPython(true)}
        >
          Edit Python path
        </Button>
      ) : (
        <Box>
          <PathField
            id="python-path"
            label="Python Path"
            value={pythonDraft}
            onChange={setPythonDraft}
          />
          {pythonDraft !== defaultPythonPath && (
            <Button
              variant="text"
              sx={{ mt: 1 }}
              onClick={() => setPythonDraft(defaultPythonPath)}
            >
              Use default
            </Button>
          )}
        </Box>
      )}
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={() => {
          setPythonPath(pythonDraft);
          setPathsSaved(true);
          setEditPython(false);
        }}
      >
        Save Paths
      </Button>
      <Typography variant="subtitle1" sx={{ mt: 3 }}>
        Output
      </Typography>
      <PathField
        id="output-folder"
        label="Default Save Folder"
        value={folderDraft}
        onChange={setFolderDraft}
        directory
      />
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={() => {
          setFolder(folderDraft);
          setOutputSaved(true);
        }}
      >
        Save Output
      </Button>
    </>
  );

  const EditorSection = () => (
    <>
      <Typography variant="subtitle1">Audio Defaults</Typography>
      <Box id="mic-enabled" sx={{ mt: 1 }}>
        <FormControlLabel
          control={<Switch checked={micEnabled} onChange={toggleMicEnabled} />}
          label="Enable Microphone"
        />
      </Box>
      <Box id="bpm" sx={{ mt: 1 }}>
        <TextField
          type="number"
          label="BPM"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          fullWidth
        />
      </Box>
      <Box id="key" sx={{ mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="key-label">Key</InputLabel>
          <Select
            labelId="key-label"
            label="Key"
            value={key}
            onChange={(e) => setKey(e.target.value as string)}
          >
            {KEY_OPTIONS.map((k) => (
              <MenuItem key={k} value={k}>
                {displayKey(k)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box id="hq-stereo">
        <FormControlLabel
          control={<Switch checked={hqStereo} onChange={toggleHqStereo} />}
          label={
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              HQ Stereo
              <HelpIcon text="Enhanced stereo width for clearer separation" />
            </span>
          }
        />
      </Box>
      <Box id="hq-reverb">
        <FormControlLabel
          control={<Switch checked={hqReverb} onChange={toggleHqReverb} />}
          label={
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              HQ Reverb
              <HelpIcon text="High-quality reverb for a more natural space" />
            </span>
          }
        />
      </Box>
      <Box id="hq-sidechain">
        <FormControlLabel
          control={<Switch checked={hqSidechain} onChange={toggleHqSidechain} />}
          label={
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              HQ Sidechain
              <HelpIcon text="Sidechain ducking for punchier kick" />
            </span>
          }
        />
      </Box>
      <Box id="hq-chorus">
        <FormControlLabel
          control={<Switch checked={hqChorus} onChange={toggleHqChorus} />}
          label={
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              HQ Chorus
              <HelpIcon text="Subtle chorus on melodic parts" />
            </span>
          }
        />
      </Box>
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={async () => {
          setGeneratingAmbience(true);
          try {
            await invoke("generate_ambience");
            setAmbienceMessage("Ambience generated");
          } catch (e) {
            setAmbienceMessage(
              `Failed to generate ambience: ${
                e instanceof Error ? e.message : String(e)
              }`,
            );
          } finally {
            setGeneratingAmbience(false);
          }
        }}
        disabled={generatingAmbience}
      >
        {generatingAmbience ? <CircularProgress size={24} /> : "Generate Ambience"}
      </Button>
      <Button variant="contained" sx={{ mt: 2 }} onClick={() => setAudioSaved(true)}>
        Save Audio Defaults
      </Button>
    </>
  );

  const AppearanceSection = () => (
    <>
      <Typography variant="subtitle1">Appearance</Typography>
      {hasUser ? (
        <>
          <Box id="theme" sx={{ mt: 2 }} onMouseLeave={() => setTheme(themeDraft)}>
            {THEME_GROUPS.map((group) => (
              <Box key={group.label} sx={{ mb: 2 }}>
                <Typography variant="subtitle2">{group.label}</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
                  {group.options.map((opt) => (
                    <Box
                      key={opt.value}
                      onMouseEnter={() => setTheme(opt.value)}
                      onClick={() => setThemeDraft(opt.value)}
                      sx={{
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          background: THEME_PREVIEWS[opt.value],
                          border:
                            themeDraft === opt.value
                              ? "2px solid #fff"
                              : "1px solid #ccc",
                          mb: 0.5,
                        }}
                      />
                      <Typography variant="caption">{opt.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
          {themeDraft === "retro" && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" component="label">
                Upload Retro TV Video
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleRetroVideoUpload}
                />
              </Button>
            </Box>
          )}
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              setTheme(themeDraft);
              setAppearanceSaved(true);
            }}
          >
            Save Appearance
          </Button>
        </>
      ) : (
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setCreateUserOpen(true)}>
          Create New User
        </Button>
      )}
    </>
  );

  const UserSection = () => (
    <>
      <Typography variant="subtitle1">User</Typography>
      {Object.keys(users).length > 0 && (
        <FormControl fullWidth size="small" sx={{ mt: 2 }} id="current-user">
          <InputLabel id="current-user-label">Current User</InputLabel>
          <Select
            labelId="current-user-label"
            value={currentUserId ?? ""}
            label="Current User"
            onChange={(e) => switchUser(e.target.value as string)}
          >
            {Object.values(users).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setCreateUserOpen(true)}>
        Create New User
      </Button>
    </>
  );

  const IntegrationsSection = () => (
    <>
      <Typography variant="subtitle1">Guides</Typography>
      <Box id="show-tutorial">
        <FormControlLabel
          control={<Switch checked={showTutorial} onChange={(e) => setShowTutorial(e.target.checked)} />}
          label="Show ComfyUI Tutorial"
        />
      </Box>
      <Typography variant="subtitle1" sx={{ mt: 3 }}>
        Modules
      </Typography>
      {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => (
        <Box id={`module-${key}`} key={key}>
          <FormControlLabel
            control={<Switch checked={modules[key]} onChange={() => toggleModule(key)} />}
            label={MODULE_LABELS[key]}
          />
        </Box>
      ))}
      <Typography variant="subtitle1" sx={{ mt: 3 }}>
        Widgets
      </Typography>
      {(Object.keys(WIDGET_LABELS) as WidgetKey[]).map((key) => (
        <Box id={`widget-${key}`} key={key}>
          <FormControlLabel
            control={<Switch checked={widgets[key]} onChange={() => toggleWidget(key)} />}
            label={WIDGET_LABELS[key]}
          />
        </Box>
      ))}
    </>
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 500, height: "100%", display: "flex" }} role="presentation">
        <Box sx={{ width: 160, borderRight: 1, borderColor: "divider" }}>
          <List>
            {(Object.keys(sectionLabels) as Section[]).map((key) => (
              <ListItemButton key={key} selected={section === key} onClick={() => setSection(key)}>
                <ListItemText primary={sectionLabels[key]} />
              </ListItemButton>
            ))}
          </List>
        </Box>
        <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Typography color="text.primary">Settings</Typography>
            <Typography color="text.primary">{sectionLabels[section]}</Typography>
          </Breadcrumbs>
          <Autocomplete
            freeSolo
            options={searchIndex.map((i) => i.label)}
            inputValue={searchValue}
            onInputChange={(_e, v) => setSearchValue(v)}
            onChange={(_e, v) => handleSearchSelect(v)}
            renderInput={(params) => <TextField {...params} label="Search settings" />}
            sx={{ mb: 2 }}
          />
          {section === "user" && <UserSection />}
          {section === "environment" && <EnvironmentSection />}
          {section === "editor" && <EditorSection />}
          {section === "appearance" && <AppearanceSection />}
          {section === "integrations" && <IntegrationsSection />}
          {section === "voices" && <VoiceSettings />}
          <Snackbar
            open={!!ambienceMessage}
            autoHideDuration={3000}
            onClose={() => setAmbienceMessage(null)}
            message={ambienceMessage}
          />
          <Snackbar
            open={audioSaved}
            autoHideDuration={3000}
            onClose={() => setAudioSaved(false)}
            message="Audio defaults saved"
          />
            <Snackbar
              open={pathsSaved}
              autoHideDuration={3000}
              onClose={() => setPathsSaved(false)}
              message="Paths saved"
            />
            <Snackbar
              open={!!pathsError}
              autoHideDuration={6000}
              onClose={clearPathsError}
            >
              <Alert
                onClose={clearPathsError}
                severity="error"
                sx={{ width: "100%" }}
              >
                {pathsError}
              </Alert>
            </Snackbar>
            <Snackbar
              open={appearanceSaved}
              autoHideDuration={3000}
              onClose={() => setAppearanceSaved(false)}
              message="Appearance saved"
            />
          <Snackbar
            open={outputSaved}
            autoHideDuration={3000}
            onClose={() => setOutputSaved(false)}
            message="Output path saved"
          />
        </Box>
      </Box>
      <CreateUserDialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
    </Drawer>
  );
}

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
} from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { usePaths } from "../features/paths/usePaths";
import { useOutput } from "../features/output/useOutput";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";
import { useTheme, type Theme } from "../features/theme/ThemeContext";
import HelpIcon from "./HelpIcon";

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
  ocean: "#0a3d5e",
  forest: "#0a3d1a",
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
  { value: "ocean", label: "Ocean" },
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

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function PathField({
  label,
  value,
  onChange,
  directory,
}: {
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
    <Box sx={{ mt: 1 }}>
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
  const { pythonPath, setPythonPath, comfyPath, setComfyPath } = usePaths();
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
  } = useAudioDefaults();
  const { theme, setTheme, mode, setMode } = useTheme();
  const [audioSaved, setAudioSaved] = useState(false);
  const [pathsSaved, setPathsSaved] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [outputSaved, setOutputSaved] = useState(false);

  const [pythonDraft, setPythonDraft] = useState(pythonPath);
  const [comfyDraft, setComfyDraft] = useState(comfyPath);
  const [folderDraft, setFolderDraft] = useState(folder);
  const [themeDraft, setThemeDraft] = useState<Theme>(theme);
  const [modeDraft, setModeDraft] = useState(mode);

  useEffect(() => setPythonDraft(pythonPath), [pythonPath]);
  useEffect(() => setComfyDraft(comfyPath), [comfyPath]);
  useEffect(() => setFolderDraft(folder), [folder]);
  useEffect(() => setThemeDraft(theme), [theme]);
  useEffect(() => setModeDraft(mode), [mode]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 3 }} role="presentation">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Settings
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Paths</Typography>
          <PathField label="Python Path" value={pythonDraft} onChange={setPythonDraft} />
          <PathField
            label="ComfyUI Folder"
            value={comfyDraft}
            onChange={setComfyDraft}
            directory
          />
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              setPythonPath(pythonDraft);
              setComfyPath(comfyDraft);
              setPathsSaved(true);
            }}
          >
            Save Paths
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Audio Defaults</Typography>
          <TextField
            type="number"
            label="BPM"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            fullWidth
            sx={{ mt: 1 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
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
          <FormControlLabel
            control={<Switch checked={hqStereo} onChange={toggleHqStereo} />}
            label={
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                HQ Stereo
                <HelpIcon text="Enhanced stereo width for clearer separation" />
              </span>
            }
          />
          <FormControlLabel
            control={<Switch checked={hqReverb} onChange={toggleHqReverb} />}
            label={
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                HQ Reverb
                <HelpIcon text="High-quality reverb for a more natural space" />
              </span>
            }
          />
          <FormControlLabel
            control={<Switch checked={hqSidechain} onChange={toggleHqSidechain} />}
            label={
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                HQ Sidechain
                <HelpIcon text="Sidechain ducking for punchier kick" />
              </span>
            }
          />
          <FormControlLabel
            control={<Switch checked={hqChorus} onChange={toggleHqChorus} />}
            label={
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                HQ Chorus
                <HelpIcon text="Subtle chorus on melodic parts" />
              </span>
            }
          />
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setAudioSaved(true)}>
            Save Audio Defaults
          </Button>
        </Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Appearance</Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="theme-label">Theme</InputLabel>
            <Select
              labelId="theme-label"
              label="Theme"
              value={themeDraft}
              onChange={(e) => setThemeDraft(e.target.value as Theme)}
            >
              {THEME_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      background: THEME_PREVIEWS[opt.value],
                      border: "1px solid #ccc",
                      mr: 1,
                    }}
                  />
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={modeDraft === "dark"}
                onChange={(e) => setModeDraft(e.target.checked ? "dark" : "light")}
              />
            }
            label="Dark Mode"
          />
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              setTheme(themeDraft);
              setMode(modeDraft);
              setAppearanceSaved(true);
            }}
          >
            Save Appearance
          </Button>
        </Box>

        <Box>
          <Typography variant="subtitle1">Output</Typography>
          <PathField
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
        </Box>
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
    </Drawer>
  );
}

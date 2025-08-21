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

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function PathField({
  label,
  value,
  onPick,
  directory,
}: {
  label: string;
  value: string;
  onPick: (p: string) => void;
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
        fullWidth
        InputProps={{ readOnly: true }}
        error={invalid}
        helperText={invalid ? "Path does not exist" : undefined}
      />
      <Button
        variant="outlined"
        sx={{ mt: 1 }}
        onClick={async () => {
          const res = await open(directory ? { directory: true } : {});
          if (typeof res === "string") onPick(res);
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

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 3 }} role="presentation">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Settings
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Paths</Typography>
          <PathField label="Python Path" value={pythonPath} onPick={setPythonPath} />
          <PathField
            label="ComfyUI Folder"
            value={comfyPath}
            onPick={setComfyPath}
            directory
          />
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
            label="HQ Stereo"
          />
          <FormControlLabel
            control={<Switch checked={hqReverb} onChange={toggleHqReverb} />}
            label="HQ Reverb"
          />
          <FormControlLabel
            control={<Switch checked={hqSidechain} onChange={toggleHqSidechain} />}
            label="HQ Sidechain"
          />
          <FormControlLabel
            control={<Switch checked={hqChorus} onChange={toggleHqChorus} />}
            label="HQ Chorus"
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
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="ocean">Ocean</MenuItem>
              <MenuItem value="forest">Forest</MenuItem>
              <MenuItem value="sunset">Sunset</MenuItem>
              <MenuItem value="sakura">Sakura</MenuItem>
              <MenuItem value="studio">Studio</MenuItem>
              <MenuItem value="galaxy">Galaxy</MenuItem>
              <MenuItem value="noir">Noir</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={mode === "dark"}
                onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
              />
            }
            label="Dark Mode"
          />
        </Box>

        <Box>
          <Typography variant="subtitle1">Output</Typography>
          <PathField
            label="Default Save Folder"
            value={folder}
            onPick={setFolder}
            directory
          />
        </Box>
        <Snackbar
          open={audioSaved}
          autoHideDuration={3000}
          onClose={() => setAudioSaved(false)}
          message="Audio defaults saved"
        />
      </Box>
    </Drawer>
  );
}

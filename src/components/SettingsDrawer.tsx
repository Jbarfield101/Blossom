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
} from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { usePaths } from "../features/paths/usePaths";
import { useOutput } from "../features/output/useOutput";
import { useAudioDefaults } from "../features/audioDefaults/useAudioDefaults";

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
  return (
    <Box sx={{ mt: 1 }}>
      <TextField label={label} value={value} fullWidth InputProps={{ readOnly: true }} />
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
              {[
                "Auto",
                "C",
                "D",
                "E",
                "F",
                "G",
                "A",
                "B",
              ].map((k) => (
                <MenuItem key={k} value={k}>
                  {k}
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
      </Box>
    </Drawer>
  );
}
